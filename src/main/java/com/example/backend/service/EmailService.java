package com.example.backend.service;

import com.google.auth.oauth2.AccessToken;
import com.google.auth.oauth2.UserCredentials;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSenderImpl mailSender;

    @Value("${google.oauth2.clientId}")
    private String clientId;

    @Value("${google.oauth2.clientSecret}")
    private String clientSecret;

    @Value("${google.oauth2.refreshToken}")
    private String refreshToken;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = (JavaMailSenderImpl) mailSender;
    }

    /**
     * Exchange the stored refresh token for a fresh access token using Google OAuth2,
     * then set it as the JavaMailSender password for XOAUTH2 SMTP authentication.
     */
    private void refreshAccessToken() {
        try {
            UserCredentials credentials = UserCredentials.newBuilder()
                    .setClientId(clientId)
                    .setClientSecret(clientSecret)
                    .setRefreshToken(refreshToken)
                    .build();

            AccessToken accessToken = credentials.refreshAccessToken();
            mailSender.setPassword(accessToken.getTokenValue());

            log.debug("OAuth2 access token refreshed successfully for Gmail SMTP");
        } catch (Exception e) {
            log.error("Failed to refresh OAuth2 access token: {}", e.getMessage(), e);
            throw new RuntimeException("Could not refresh Gmail OAuth2 access token", e);
        }
    }

    public void sendEmail(String to, String subject, String body) {
        refreshAccessToken();

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
            throw new RuntimeException("Failed to send email", e);
        }
    }
}
