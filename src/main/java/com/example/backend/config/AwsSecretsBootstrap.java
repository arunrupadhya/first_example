package com.example.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.util.StringUtils;

import java.io.InputStream;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Properties;

public final class AwsSecretsBootstrap {

    private static final Logger log = LoggerFactory.getLogger(AwsSecretsBootstrap.class);

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

        Map<String, String> secrets = AwsSecretsHazelcastBootstrap.loadSecretsIntoCache(
                secretName,
                region,
                accessKey,
                secretKey);

        secrets.forEach((key, value) -> {
            if (StringUtils.hasText(key) && StringUtils.hasText(value) && !StringUtils.hasText(System.getProperty(key))) {
                System.setProperty(key, value);
            }
        });

        if (!secrets.isEmpty()) {
            log.info("Bootstrapped {} AWS secret entries from Hazelcast before Spring startup.", secrets.size());
        } else {
            log.warn("No AWS secrets were available in Hazelcast during startup bootstrap.");
        }
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

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return "";
    }
}
