package com.example.backend.service;

import com.example.backend.dto.MessageDto;
import com.example.backend.model.Message;
import com.example.backend.model.User;
import com.example.backend.repository.MessageRepository;
import com.example.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class MessageService {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    public MessageService(MessageRepository messageRepository, UserRepository userRepository) {
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public MessageDto sendMessage(String senderUsername, String recipientUsername, String content) {
        User sender = userRepository.findByUsername(senderUsername)
                .orElseThrow(() -> new RuntimeException("Sender not found"));
        User recipient = userRepository.findByUsername(recipientUsername)
                .orElseThrow(() -> new RuntimeException("Recipient not found"));

        if (sender.getId().equals(recipient.getId())) {
            throw new RuntimeException("Cannot send message to yourself");
        }

        Message message = new Message(sender, recipient, content);
        message = messageRepository.save(message);
        return toDto(message);
    }

    @Transactional(readOnly = true)
    public List<MessageDto> getConversation(String currentUsername, String otherUsername) {
        User currentUser = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));
        User otherUser = userRepository.findByUsername(otherUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return messageRepository.findConversation(currentUser, otherUser)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<String> getConversationPartners(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return messageRepository.findConversationPartners(user)
                .stream().map(User::getUsername).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<String> getAllUsers(String currentUsername) {
        return userRepository.findAll().stream()
                .map(User::getUsername)
                .filter(u -> !u.equals(currentUsername))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return messageRepository.countUnreadMessages(user);
    }

    @Transactional(readOnly = true)
    public long getUnreadFromUser(String senderUsername, String recipientUsername) {
        User sender = userRepository.findByUsername(senderUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));
        User recipient = userRepository.findByUsername(recipientUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return messageRepository.countUnreadFromUser(sender, recipient);
    }

    @Transactional
    public void markAsRead(String senderUsername, String recipientUsername) {
        User sender = userRepository.findByUsername(senderUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));
        User recipient = userRepository.findByUsername(recipientUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));
        messageRepository.markConversationAsRead(sender, recipient);
    }

    private MessageDto toDto(Message message) {
        return new MessageDto(
                message.getId(),
                message.getSender().getUsername(),
                message.getRecipient().getUsername(),
                message.getContent(),
                message.getTimestamp(),
                message.isRead()
        );
    }
}
