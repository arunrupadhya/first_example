package com.example.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueResponse;

import jakarta.annotation.PostConstruct;
import java.util.Map;

@Component
public class AwsSecretsConfig {

    @Value("${aws.secret.name:dev/my-app/db-credentials}")
    private String secretName;

    @PostConstruct
    public void loadSecrets() {
        try {
            SecretsManagerClient client = SecretsManagerClient.builder()
                    .region(Region.AP_SOUTH_1) // Change to your region
                    .build();

            GetSecretValueRequest request = GetSecretValueRequest.builder()
                    .secretId(secretName)
                    .build();

            GetSecretValueResponse response = client.getSecretValue(request);
            String secretString = response.secretString();

            // Assuming the secret is JSON like {"DB_USERNAME":"value","DB_PASSWORD":"value"}
            // Parse and set as system properties
            // For simplicity, if it's key-value pairs
            Map<String, String> secrets = parseSecretString(secretString);
            if (secrets.containsKey("DB_USERNAME")) {
                System.setProperty("DB_USERNAME", secrets.get("DB_USERNAME"));
            }
            if (secrets.containsKey("DB_PASSWORD")) {
                System.setProperty("DB_PASSWORD", secrets.get("DB_PASSWORD"));
            }

            client.close();
        } catch (Exception e) {
            System.err.println("Failed to load secrets from AWS: " + e.getMessage());
            // Fallback to environment variables
        }
    }

    private Map<String, String> parseSecretString(String secretString) {
        // Simple JSON parsing, assuming {"key":"value"} format
        // In production, use a JSON library
        Map<String, String> map = new java.util.HashMap<>();
        secretString = secretString.trim();
        if (secretString.startsWith("{") && secretString.endsWith("}")) {
            secretString = secretString.substring(1, secretString.length() - 1);
            String[] pairs = secretString.split(",");
            for (String pair : pairs) {
                String[] keyValue = pair.split(":");
                if (keyValue.length == 2) {
                    String key = keyValue[0].trim().replace("\"", "");
                    String value = keyValue[1].trim().replace("\"", "");
                    map.put(key, value);
                }
            }
        }
        return map;
    }
}