package com.example.backend.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Map;

@Component
public class AwsSecretsConfig {

    private static final Logger log = LoggerFactory.getLogger(AwsSecretsConfig.class);

    @Value("${aws.secret.name:}")
    private String secretName;

    @Value("${aws.secrets.region:${aws.s3.region:us-east-1}}")
    private String secretRegion;

    @Value("${aws.s3.access-key:${AWS_ACCESS_KEY_ID:}}")
    private String accessKey;

    @Value("${aws.s3.secret-key:${AWS_SECRET_ACCESS_KEY:}}")
    private String secretKey;

    @PostConstruct
    public void loadSecrets() {
        if (!StringUtils.hasText(secretName)) {
            log.info("AWS secret name is not configured; using environment and application properties.");
            return;
        }

        Map<String, String> cachedSecrets = AwsSecretsHazelcastBootstrap.loadSecretsIntoCache(
                secretName,
                secretRegion,
                accessKey,
                secretKey);

        cachedSecrets.forEach((key, value) -> {
            if (StringUtils.hasText(key) && StringUtils.hasText(value) && !StringUtils.hasText(System.getProperty(key))) {
                System.setProperty(key, value);
            }
        });

        if (!cachedSecrets.isEmpty()) {
            log.info("Loaded {} entries from Hazelcast-backed AWS secret cache.", cachedSecrets.size());
        } else {
            log.warn("Hazelcast secret cache is empty. The application will continue with existing environment values.");
        }
    }
}