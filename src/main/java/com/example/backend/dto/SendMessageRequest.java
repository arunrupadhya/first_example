package com.example.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class SendMessageRequest {

    @NotBlank(message = "Recipient is required")
    private String recipientUsername;

    @NotBlank(message = "Message content is required")
    @Size(max = 2000, message = "Message must be under 2000 characters")
    private String content;

    public SendMessageRequest() {}

    public String getRecipientUsername() { return recipientUsername; }
    public void setRecipientUsername(String recipientUsername) { this.recipientUsername = recipientUsername; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}
