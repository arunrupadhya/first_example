package com.example.backend.controller;

import com.example.backend.config.WebSocketEventListener;
import com.example.backend.dto.MessageDto;
import com.example.backend.dto.SendMessageRequest;
import com.example.backend.service.MessageService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@RestController
@RequestMapping("/api/messages")
public class ChatController {

    private final MessageService messageService;
    private final SimpMessagingTemplate messagingTemplate;
    private final WebSocketEventListener webSocketEventListener;

    public ChatController(MessageService messageService, SimpMessagingTemplate messagingTemplate,
                          WebSocketEventListener webSocketEventListener) {
        this.messageService = messageService;
        this.messagingTemplate = messagingTemplate;
        this.webSocketEventListener = webSocketEventListener;
    }

    @GetMapping("/users")
    public ResponseEntity<List<String>> getAllUsers(Principal principal) {
        return ResponseEntity.ok(messageService.getAllUsers(principal.getName()));
    }

    @GetMapping("/conversations")
    public ResponseEntity<List<String>> getConversationPartners(Principal principal) {
        return ResponseEntity.ok(messageService.getConversationPartners(principal.getName()));
    }

    @GetMapping("/conversation/{username}")
    public ResponseEntity<List<MessageDto>> getConversation(@PathVariable String username, Principal principal) {
        return ResponseEntity.ok(messageService.getConversation(principal.getName(), username));
    }

    @GetMapping("/unread")
    public ResponseEntity<Map<String, Long>> getUnreadCount(Principal principal) {
        long count = messageService.getUnreadCount(principal.getName());
        return ResponseEntity.ok(Map.of("count", count));
    }

    @PostMapping("/read/{username}")
    public ResponseEntity<Void> markAsRead(@PathVariable String username, Principal principal) {
        messageService.markAsRead(username, principal.getName());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/online")
    public ResponseEntity<Set<String>> getOnlineUsers() {
        return ResponseEntity.ok(webSocketEventListener.getOnlineUsers());
    }

    @PostMapping("/send")
    @SuppressWarnings("null")
    public ResponseEntity<MessageDto> sendMessage(@Valid @RequestBody SendMessageRequest request, Principal principal) {
        String recipientUsername = Objects.requireNonNull(request.getRecipientUsername());
        MessageDto msg = messageService.sendMessage(principal.getName(), recipientUsername, request.getContent());
        messagingTemplate.convertAndSendToUser(recipientUsername, "/queue/messages", msg);
        return ResponseEntity.ok(msg);
    }

    @MessageMapping("/chat.send")
    @SuppressWarnings("null")
    public void handleWebSocketMessage(@Payload SendMessageRequest request, Principal principal) {
        String recipientUsername = Objects.requireNonNull(request.getRecipientUsername());
        String senderName = Objects.requireNonNull(principal.getName());
        MessageDto msg = messageService.sendMessage(senderName, recipientUsername, request.getContent());
        messagingTemplate.convertAndSendToUser(recipientUsername, "/queue/messages", msg);
        messagingTemplate.convertAndSendToUser(senderName, "/queue/messages", msg);
    }

    @MessageMapping("/chat.typing")
    @SuppressWarnings("null")
    public void handleTyping(@Payload Map<String, Object> payload, Principal principal) {
        String recipient = (String) payload.get("recipientUsername");
        boolean typing = Boolean.TRUE.equals(payload.get("typing"));
        if (recipient != null && principal != null) {
            String username = Objects.requireNonNull(principal.getName());
            messagingTemplate.convertAndSendToUser(recipient, "/queue/typing",
                    Map.of("username", username, "typing", typing));
        }
    }
}
