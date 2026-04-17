package com.example.backend.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
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

public class AwsSecretsManagerEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    private static final Logger log = LoggerFactory.getLogger(AwsSecretsManagerEnvironmentPostProcessor.class);
    private static final String PROPERTY_SOURCE_NAME = "awsSecretsManager";

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        Map<String, String> bootstrapProperties = loadBootstrapProperties();

        String secretName = firstNonBlank(
                environment.getProperty("aws.secret.name"),
                environment.getProperty("aws.secret.arn"),
                environment.getProperty("AWS_SECRET_NAME"),
                environment.getProperty("AWS_SECRET_ARN"),
                bootstrapProperties.get("aws.secret.name"),
                bootstrapProperties.get("aws.secret.arn")
        );

        if (!StringUtils.hasText(secretName)) {
            return;
        }

        String region = firstNonBlank(
                environment.getProperty("aws.secrets.region"),
                environment.getProperty("AWS_SECRETS_REGION"),
                environment.getProperty("AWS_REGION"),
                bootstrapProperties.get("aws.secrets.region"),
                bootstrapProperties.get("aws.s3.region"),
                "us-east-1"
        );

        String accessKey = firstNonBlank(
                environment.getProperty("aws.s3.access-key"),
                environment.getProperty("AWS_ACCESS_KEY_ID"),
                bootstrapProperties.get("aws.s3.access-key")
        );
        String secretKey = firstNonBlank(
                environment.getProperty("aws.s3.secret-key"),
                environment.getProperty("AWS_SECRET_ACCESS_KEY"),
                bootstrapProperties.get("aws.s3.secret-key")
        );

        try (SecretsManagerClient client = SecretsManagerClient.builder()
                .region(Region.of(region))
                .credentialsProvider(credentialsProvider(accessKey, secretKey))
                .build()) {

            GetSecretValueRequest request = GetSecretValueRequest.builder()
                    .secretId(secretName)
                    .build();

            GetSecretValueResponse response = client.getSecretValue(request);
            Map<String, Object> rawSecrets = parseSecretString(response.secretString());
            if (rawSecrets.isEmpty()) {
                log.warn("AWS secret '{}' did not contain any usable entries.", secretName);
                return;
            }

            Map<String, Object> resolvedSecrets = new LinkedHashMap<>(rawSecrets);
            applyAliases(resolvedSecrets, rawSecrets);

            environment.getPropertySources().addFirst(new MapPropertySource(PROPERTY_SOURCE_NAME, resolvedSecrets));
            log.info("Loaded {} configuration entries from AWS Secrets Manager secret '{}'.", resolvedSecrets.size(), secretName);
        } catch (Exception e) {
            log.warn("Unable to load AWS secrets from '{}': {}", secretName, e.getMessage());
        }
    }

    private Map<String, Object> parseSecretString(String secretString) {
        if (!StringUtils.hasText(secretString)) {
            return Map.of();
        }

        try {
            Map<String, Object> rawSecrets = objectMapper.readValue(secretString, new TypeReference<Map<String, Object>>() {});
            Map<String, Object> parsedSecrets = new LinkedHashMap<>();
            rawSecrets.forEach((key, value) -> {
                String normalizedValue = normalizeSecretValue(key, value);
                if (StringUtils.hasText(key) && StringUtils.hasText(normalizedValue)) {
                    parsedSecrets.put(key, normalizedValue);
                }
            });
            return parsedSecrets;
        } catch (Exception e) {
            log.warn("AWS secret payload is not valid JSON: {}", e.getMessage());
            return Map.of();
        }
    }

    private String normalizeSecretValue(String key, Object value) {
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

    private void applyAliases(Map<String, Object> resolvedSecrets, Map<String, Object> rawSecrets) {
        alias(resolvedSecrets, rawSecrets, "spring.datasource.username", "DB_USERNAME", "SPRING_DATASOURCE_USERNAME");
        alias(resolvedSecrets, rawSecrets, "spring.datasource.password", "DB_PASSWORD", "SPRING_DATASOURCE_PASSWORD");
        alias(resolvedSecrets, rawSecrets, "aws.s3.access-key", "AWS_ACCESS_KEY_ID");
        alias(resolvedSecrets, rawSecrets, "aws.s3.secret-key", "AWS_SECRET_ACCESS_KEY");
        alias(resolvedSecrets, rawSecrets, "aws.s3.bucket-name", "AWS_S3_BUCKET_NAME");
        alias(resolvedSecrets, rawSecrets, "aws.s3.region", "AWS_REGION");
        alias(resolvedSecrets, rawSecrets, "spring.mail.username", "MAIL_USERNAME");
        alias(resolvedSecrets, rawSecrets, "google.oauth2.clientId", "GOOGLE_OAUTH2_CLIENT_ID");
        alias(resolvedSecrets, rawSecrets, "google.oauth2.clientSecret", "GOOGLE_OAUTH2_CLIENT_SECRET");
        alias(resolvedSecrets, rawSecrets, "google.oauth2.refreshToken", "GOOGLE_OAUTH2_REFRESH_TOKEN");
        alias(resolvedSecrets, rawSecrets, "app.jwt.secret", "JWT_SECRET");
        alias(resolvedSecrets, rawSecrets, "aws.bedrock.region", "AWS_BEDROCK_REGION");
        alias(resolvedSecrets, rawSecrets, "aws.bedrock.model-id", "AWS_BEDROCK_MODEL_ID");
    }

    private void alias(Map<String, Object> resolvedSecrets, Map<String, Object> rawSecrets, String targetKey, String... sourceKeys) {
        if (resolvedSecrets.containsKey(targetKey) && StringUtils.hasText(String.valueOf(resolvedSecrets.get(targetKey)))) {
            return;
        }

        for (String sourceKey : sourceKeys) {
            Object value = rawSecrets.get(sourceKey);
            if (value != null && StringUtils.hasText(String.valueOf(value))) {
                resolvedSecrets.put(targetKey, String.valueOf(value));
                return;
            }
        }
    }

    private Map<String, String> loadBootstrapProperties() {
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
            log.debug("Unable to read bootstrap properties before secret loading: {}", e.getMessage());
            return Map.of();
        }
    }

    private String sanitizeConfiguredValue(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        String trimmed = value.trim();
        if (trimmed.contains("${") || trimmed.contains("}")) {
            return "";
        }
        return trimmed;
    }

    private AwsCredentialsProvider credentialsProvider(String accessKey, String secretKey) {
        if (StringUtils.hasText(accessKey) && StringUtils.hasText(secretKey)) {
            return StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(accessKey.trim(), secretKey.trim()));
        }
        return DefaultCredentialsProvider.create();
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return "";
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 10;
    }
}
