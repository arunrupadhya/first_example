package com.example.backend.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hazelcast.config.Config;
import com.hazelcast.config.JoinConfig;
import com.hazelcast.config.MapConfig;
import com.hazelcast.core.Hazelcast;
import com.hazelcast.core.HazelcastInstance;
import com.hazelcast.map.IMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.util.StringUtils;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueResponse;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

public final class AwsSecretsHazelcastBootstrap {

    private static final Logger log = LoggerFactory.getLogger(AwsSecretsHazelcastBootstrap.class);
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final String INSTANCE_NAME = "backend-secrets-cache";
    private static final String CLUSTER_NAME = "backend-secrets-cluster";
    private static final String MAP_NAME = "aws-secrets";
    private static final Object LOCK = new Object();

    private AwsSecretsHazelcastBootstrap() {
    }

    public static Map<String, String> loadSecretsIntoCache(String secretName, String region, String accessKey, String secretKey) {
        IMap<String, String> secretCache = getSecretCache();
        if (!secretCache.isEmpty()) {
            log.info("Using {} secret entries from Hazelcast cache.", secretCache.size());
            return new LinkedHashMap<>(secretCache);
        }

        if (!StringUtils.hasText(secretName)) {
            return Map.of();
        }

        synchronized (LOCK) {
            if (!secretCache.isEmpty()) {
                return new LinkedHashMap<>(secretCache);
            }

            try (SecretsManagerClient client = SecretsManagerClient.builder()
                    .region(Region.of(StringUtils.hasText(region) ? region : "us-east-1"))
                    .credentialsProvider(credentialsProvider(accessKey, secretKey))
                    .build()) {

                GetSecretValueResponse response = client.getSecretValue(
                        GetSecretValueRequest.builder().secretId(secretName).build());

                Map<String, String> secrets = parseSecretString(response.secretString());
                applyAliases(secrets);

                secrets.forEach((key, value) -> {
                    if (StringUtils.hasText(key) && StringUtils.hasText(value)) {
                        secretCache.put(key, value, 1, TimeUnit.HOURS);
                    }
                });

                log.info("Loaded {} AWS secret entries into Hazelcast cache '{}'.", secretCache.size(), MAP_NAME);
            } catch (Exception e) {
                log.warn("Unable to populate Hazelcast secret cache from AWS '{}': {}", secretName, e.getMessage());
            }

            return new LinkedHashMap<>(secretCache);
        }
    }

    public static Map<String, String> getCachedSecrets() {
        return new LinkedHashMap<>(getSecretCache());
    }

    public static String getSecret(String key) {
        String value = getSecretCache().get(key);
        if (StringUtils.hasText(value)) {
            return value;
        }
        return System.getProperty(key, "");
    }

    private static IMap<String, String> getSecretCache() {
        return hazelcastInstance().getMap(MAP_NAME);
    }

    private static HazelcastInstance hazelcastInstance() {
        HazelcastInstance existing = Hazelcast.getHazelcastInstanceByName(INSTANCE_NAME);
        if (existing != null) {
            return existing;
        }

        synchronized (LOCK) {
            HazelcastInstance rechecked = Hazelcast.getHazelcastInstanceByName(INSTANCE_NAME);
            if (rechecked != null) {
                return rechecked;
            }

            Config config = new Config();
            config.setInstanceName(INSTANCE_NAME);
            config.setClusterName(CLUSTER_NAME);
            config.addMapConfig(new MapConfig(MAP_NAME)
                    .setTimeToLiveSeconds((int) TimeUnit.HOURS.toSeconds(1))
                    .setBackupCount(1));

            JoinConfig joinConfig = config.getNetworkConfig().getJoin();
            joinConfig.getMulticastConfig().setEnabled(false);
            joinConfig.getTcpIpConfig().setEnabled(false);
            joinConfig.getAutoDetectionConfig().setEnabled(false);

            return Hazelcast.newHazelcastInstance(config);
        }
    }

    private static Map<String, String> parseSecretString(String secretString) {
        if (!StringUtils.hasText(secretString)) {
            return new LinkedHashMap<>();
        }

        try {
            Map<String, Object> rawSecrets = OBJECT_MAPPER.readValue(secretString, new TypeReference<Map<String, Object>>() {});
            Map<String, String> parsed = new LinkedHashMap<>();
            rawSecrets.forEach((key, value) -> {
                String normalized = normalizeSecretValue(key, value);
                if (StringUtils.hasText(key) && StringUtils.hasText(normalized)) {
                    parsed.put(key, normalized);
                }
            });
            return parsed;
        } catch (Exception e) {
            log.warn("AWS secret payload is not valid JSON: {}", e.getMessage());
            return new LinkedHashMap<>();
        }
    }

    private static void applyAliases(Map<String, String> secrets) {
        alias(secrets, "spring.datasource.username", "DB_USERNAME", "SPRING_DATASOURCE_USERNAME");
        alias(secrets, "spring.datasource.password", "DB_PASSWORD", "SPRING_DATASOURCE_PASSWORD");
        alias(secrets, "spring.datasource.url", "DB_URL", "SPRING_DATASOURCE_URL");
        alias(secrets, "aws.s3.access-key", "AWS_ACCESS_KEY_ID");
        alias(secrets, "aws.s3.secret-key", "AWS_SECRET_ACCESS_KEY");
        alias(secrets, "aws.s3.bucket-name", "AWS_S3_BUCKET_NAME");
        alias(secrets, "aws.s3.region", "AWS_REGION");
        alias(secrets, "spring.mail.username", "MAIL_USERNAME");
        alias(secrets, "google.oauth2.clientId", "GOOGLE_OAUTH2_CLIENT_ID");
        alias(secrets, "google.oauth2.clientSecret", "GOOGLE_OAUTH2_CLIENT_SECRET");
        alias(secrets, "google.oauth2.refreshToken", "GOOGLE_OAUTH2_REFRESH_TOKEN");
        alias(secrets, "app.jwt.secret", "JWT_SECRET");
    }

    private static void alias(Map<String, String> secrets, String targetKey, String... sourceKeys) {
        if (StringUtils.hasText(secrets.get(targetKey))) {
            return;
        }

        for (String sourceKey : sourceKeys) {
            String value = secrets.get(sourceKey);
            if (StringUtils.hasText(value)) {
                secrets.put(targetKey, value);
                return;
            }
        }
    }

    private static String normalizeSecretValue(String key, Object value) {
        if (value == null) {
            return "";
        }

        String text = String.valueOf(value).trim();
        if (!StringUtils.hasText(text)) {
            return "";
        }

        if ("SPRING_DATASOURCE_URL".equals(key) || "DB_URL".equals(key) || "spring.datasource.url".equals(key)) {
            if (text.startsWith("jdbcjdbc:")) {
                return text.replaceFirst("^jdbcjdbc:", "jdbc:");
            }
            if (text.startsWith("jdbcpostgresql://")) {
                return text.replaceFirst("^jdbcpostgresql://", "jdbc:postgresql://");
            }
        }

        return text;
    }

    private static AwsCredentialsProvider credentialsProvider(String accessKey, String secretKey) {
        if (StringUtils.hasText(accessKey) && StringUtils.hasText(secretKey)) {
            return StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(accessKey.trim(), secretKey.trim()));
        }
        return DefaultCredentialsProvider.create();
    }
}
