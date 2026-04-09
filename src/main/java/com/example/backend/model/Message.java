package com.example.backend.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "messages", indexes = {
    @Index(name = "idx_messages_sender_recipient", columnList = "sender_id, recipient_id"),
    @Index(name = "idx_messages_recipient_read", columnList = "recipient_id, is_read"),
    @Index(name = "idx_messages_timestamp", columnList = "timestamp")
})
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false)
    private Instant timestamp;

    @Column(name = "is_read", nullable = false)
    private boolean read = false;

    public Message() {}

    public Message(User sender, User recipient, String content) {
        this.sender = sender;
        this.recipient = recipient;
        this.content = content;
        this.timestamp = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getSender() { return sender; }
    public void setSender(User sender) { this.sender = sender; }

    public User getRecipient() { return recipient; }
    public void setRecipient(User recipient) { this.recipient = recipient; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }

    public boolean isRead() { return read; }
    public void setRead(boolean read) { this.read = read; }
}
