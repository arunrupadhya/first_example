package com.example.backend.dto;

import java.time.Instant;

public class MessageDto {

    private Long id;
    private String senderUsername;
    private String recipientUsername;
    private String content;
    private Instant timestamp;
    private boolean read;

    public MessageDto() {}

    public MessageDto(Long id, String senderUsername, String recipientUsername, String content, Instant timestamp, boolean read) {
        this.id = id;
        this.senderUsername = senderUsername;
        this.recipientUsername = recipientUsername;
        this.content = content;
        this.timestamp = timestamp;
        this.read = read;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSenderUsername() { return senderUsername; }
    public void setSenderUsername(String senderUsername) { this.senderUsername = senderUsername; }

    public String getRecipientUsername() { return recipientUsername; }
    public void setRecipientUsername(String recipientUsername) { this.recipientUsername = recipientUsername; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }

    public boolean isRead() { return read; }
    public void setRead(boolean read) { this.read = read; }
}
