package com.example.backend.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueResponse;

import jakarta.annotation.PostConstruct;
import java.util.HashMap;
import java.util.Map;

@Component
public class AwsSecretsConfig {

    private static final Logger log = LoggerFactory.getLogger(AwsSecretsConfig.class);

    private final ObjectMapper objectMapper;

    @Value("${aws.secret.name:}")
    private String secretName;

    @Value("${aws.secrets.region:${aws.s3.region:us-east-1}}")
    private String secretRegion;

    @Value("${aws.s3.access-key:${AWS_ACCESS_KEY_ID:}}")
    private String accessKey;

    @Value("${aws.s3.secret-key:${AWS_SECRET_ACCESS_KEY:}}")
    private String secretKey;

    public AwsSecretsConfig(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void loadSecrets() {
        if (!StringUtils.hasText(secretName)) {
            log.info("AWS secret name is not configured; using environment and application properties.");
            return;
        }

        try (SecretsManagerClient client = SecretsManagerClient.builder()
                .region(Region.of(secretRegion))
                .credentialsProvider(credentialsProvider())
                .build()) {

            GetSecretValueRequest request = GetSecretValueRequest.builder()
                    .secretId(secretName)
                    .build();

            GetSecretValueResponse response = client.getSecretValue(request);
            Map<String, String> secrets = parseSecretString(response.secretString());

            secrets.forEach((key, value) -> {
                if (StringUtils.hasText(key) && StringUtils.hasText(value) && !StringUtils.hasText(System.getProperty(key))) {
                    System.setProperty(key, value);
                }
            });

            log.info("Loaded {} entries from AWS Secrets Manager.", secrets.size());
        } catch (Exception e) {
            log.warn("Failed to load secrets from AWS Secrets Manager '{}': {}", secretName, e.getMessage());
        }
    }

    private AwsCredentialsProvider credentialsProvider() {
        if (StringUtils.hasText(accessKey) && StringUtils.hasText(secretKey)) {
            return StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(accessKey.trim(), secretKey.trim()));
        }
        return DefaultCredentialsProvider.create();
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

    private Map<String, String> parseSecretString(String secretString) {
        if (!StringUtils.hasText(secretString)) {
            return Map.of();
        }

        try {
            Map<String, Object> rawSecrets = objectMapper.readValue(secretString, new TypeReference<Map<String, Object>>() {});
            Map<String, String> parsedSecrets = new HashMap<>();
            rawSecrets.forEach((key, value) -> parsedSecrets.put(key, normalizeSecretValue(key, value)));
            return parsedSecrets;
        } catch (Exception e) {
            log.warn("Secret payload is not valid JSON. No properties were imported.");
            return Map.of();
        }
    }
}