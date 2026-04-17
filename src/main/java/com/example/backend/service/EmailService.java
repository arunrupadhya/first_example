package com.example.backend.service;

import com.google.auth.oauth2.AccessToken;
import com.google.auth.oauth2.UserCredentials;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSenderImpl mailSender;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${google.oauth2.clientId:}")
    private String clientId;

    @Value("${google.oauth2.clientSecret:}")
    private String clientSecret;

    @Value("${google.oauth2.refreshToken:}")
    private String refreshToken;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = (JavaMailSenderImpl) mailSender;
    }

    private boolean hasOAuthConfig() {
        return StringUtils.hasText(mailUsername)
                && StringUtils.hasText(clientId)
                && StringUtils.hasText(clientSecret)
                && StringUtils.hasText(refreshToken);
    }

    /**
     * Exchange the stored refresh token for a fresh access token using Google OAuth2,
     * then set it as the JavaMailSender password for XOAUTH2 SMTP authentication.
     */
    private void refreshAccessToken() {
        if (!hasOAuthConfig()) {
            throw new IllegalStateException(
                    "Google OAuth2 mail configuration is incomplete. Set GOOGLE_OAUTH2_CLIENT_ID, GOOGLE_OAUTH2_CLIENT_SECRET, and GOOGLE_OAUTH2_REFRESH_TOKEN.");
        }

        try {
            UserCredentials credentials = UserCredentials.newBuilder()
                    .setClientId(clientId.trim())
                    .setClientSecret(clientSecret.trim())
                    .setRefreshToken(refreshToken.trim())
                    .build();

            AccessToken accessToken = credentials.refreshAccessToken();
            mailSender.setUsername(mailUsername.trim());
            mailSender.setPassword(accessToken.getTokenValue());
            mailSender.getJavaMailProperties().put("mail.smtp.auth.mechanisms", "XOAUTH2");
            log.debug("OAuth2 access token refreshed successfully for Gmail SMTP");
        } catch (Exception e) {
            log.error("Failed to refresh OAuth2 access token: {}", e.getMessage(), e);
            throw new RuntimeException("Could not refresh Gmail OAuth2 access token: " + e.getMessage(), e);
        }
    }

    private void configureAuthentication() {
        if (!hasOAuthConfig()) {
            throw new IllegalStateException(
                    "Email is not configured for OAuth2. Set MAIL_USERNAME, GOOGLE_OAUTH2_CLIENT_ID, GOOGLE_OAUTH2_CLIENT_SECRET, and GOOGLE_OAUTH2_REFRESH_TOKEN.");
        }

        refreshAccessToken();
    }

    public void sendEmail(String to, String subject, String body) {
        configureAuthentication();

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body);
            helper.setFrom(mailSender.getUsername());
            mailSender.send(message);
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage(), e);
            throw new RuntimeException("Failed to send email: " + e.getMessage(), e);
        }
    }
}
