package com.example.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.util.StringUtils;

import java.io.InputStream;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Properties;

public class AwsSecretsManagerEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    private static final Logger log = LoggerFactory.getLogger(AwsSecretsManagerEnvironmentPostProcessor.class);
    private static final String PROPERTY_SOURCE_NAME = "awsSecretsHazelcast";

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

        Map<String, String> cachedSecrets = AwsSecretsHazelcastBootstrap.loadSecretsIntoCache(
                secretName,
                region,
                accessKey,
                secretKey);

        if (cachedSecrets.isEmpty()) {
            log.warn("Hazelcast secret cache is empty for '{}'.", secretName);
            return;
        }

        environment.getPropertySources().addFirst(new MapPropertySource(PROPERTY_SOURCE_NAME, new LinkedHashMap<>(cachedSecrets)));
        log.info("Loaded {} configuration entries from Hazelcast-backed AWS secret cache.", cachedSecrets.size());
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
