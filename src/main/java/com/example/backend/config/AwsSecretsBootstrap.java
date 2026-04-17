package com.example.backend.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
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

import java.io.InputStream;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Properties;

public final class AwsSecretsBootstrap {

    private static final Logger log = LoggerFactory.getLogger(AwsSecretsBootstrap.class);
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private AwsSecretsBootstrap() {
    }

    public static void initialize() {
        Map<String, String> bootstrapProperties = loadBootstrapProperties();

        String secretName = firstNonBlank(
                System.getProperty("aws.secret.name"),
                System.getenv("AWS_SECRET_NAME"),
                bootstrapProperties.get("aws.secret.name")
        );

        if (!StringUtils.hasText(secretName)) {
            return;
        }

        String region = firstNonBlank(
                System.getProperty("aws.secrets.region"),
                System.getenv("AWS_SECRETS_REGION"),
                System.getenv("AWS_REGION"),
                bootstrapProperties.get("aws.secrets.region"),
                bootstrapProperties.get("aws.s3.region"),
                "us-east-1"
        );

        String accessKey = firstNonBlank(
                System.getProperty("aws.s3.access-key"),
                System.getenv("AWS_ACCESS_KEY_ID")
        );
        String secretKey = firstNonBlank(
                System.getProperty("aws.s3.secret-key"),
                System.getenv("AWS_SECRET_ACCESS_KEY")
        );

        try (SecretsManagerClient client = SecretsManagerClient.builder()
                .region(Region.of(region))
                .credentialsProvider(credentialsProvider(accessKey, secretKey))
                .build()) {

            GetSecretValueResponse response = client.getSecretValue(
                    GetSecretValueRequest.builder().secretId(secretName).build());

            Map<String, String> secrets = parseSecretString(response.secretString());
            applyAliases(secrets);

            secrets.forEach((key, value) -> {
                if (StringUtils.hasText(key) && StringUtils.hasText(value) && !StringUtils.hasText(System.getProperty(key))) {
                    System.setProperty(key, value);
                }
            });

            log.info("Bootstrapped {} AWS secret entries before Spring startup.", secrets.size());
        } catch (Exception e) {
            log.warn("Early AWS secret bootstrap failed for '{}': {}", secretName, e.getMessage());
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
        alias(secrets, "aws.s3.access-key", "AWS_ACCESS_KEY_ID");
        alias(secrets, "aws.s3.secret-key", "AWS_SECRET_ACCESS_KEY");
        alias(secrets, "aws.s3.bucket-name", "AWS_S3_BUCKET_NAME");
        alias(secrets, "aws.s3.region", "AWS_REGION");
        alias(secrets, "spring.mail.username", "MAIL_USERNAME");
        alias(secrets, "google.oauth2.clientId", "GOOGLE_OAUTH2_CLIENT_ID");
        alias(secrets, "google.oauth2.clientSecret", "GOOGLE_OAUTH2_CLIENT_SECRET");
        alias(secrets, "google.oauth2.refreshToken", "GOOGLE_OAUTH2_REFRESH_TOKEN");
        alias(secrets, "app.jwt.secret", "JWT_SECRET");
        alias(secrets, "aws.bedrock.region", "AWS_BEDROCK_REGION");
        alias(secrets, "aws.bedrock.model-id", "AWS_BEDROCK_MODEL_ID");
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

    private static Map<String, String> loadBootstrapProperties() {
        Properties properties = new Properties();
        try (InputStream inputStream = Thread.currentThread().getContextClassLoader().getResourceAsStream("application.properties")) {
            if (inputStream == null) {
                return Map.of();
            }
            properties.load(inputStream);
            Map<String, String> bootstrap = new LinkedHashMap<>();
            properties.forEach((key, value) -> {
                String resolved = sanitizeConfiguredValue(String.valueOf(value));
                if (StringUtils.hasText(resolved)) {
                    bootstrap.put(String.valueOf(key), resolved);
                }
            });
            return bootstrap;
        } catch (Exception e) {
            log.debug("Unable to read bootstrap properties: {}", e.getMessage());
            return Map.of();
        }
    }

    private static String sanitizeConfiguredValue(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        String trimmed = value.trim();
        if (trimmed.contains("${") || trimmed.contains("}")) {
            return "";
        }
        return trimmed;
    }

    private static AwsCredentialsProvider credentialsProvider(String accessKey, String secretKey) {
        if (StringUtils.hasText(accessKey) && StringUtils.hasText(secretKey)) {
            return StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(accessKey.trim(), secretKey.trim()));
        }
        return DefaultCredentialsProvider.create();
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return "";
    }
}
