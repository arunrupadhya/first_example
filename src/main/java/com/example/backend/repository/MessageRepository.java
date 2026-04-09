package com.example.backend.repository;

import com.example.backend.model.Message;
import com.example.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

    @Query("SELECT m FROM Message m WHERE " +
           "(m.sender = :user1 AND m.recipient = :user2) OR " +
           "(m.sender = :user2 AND m.recipient = :user1) " +
           "ORDER BY m.timestamp ASC")
    List<Message> findConversation(@Param("user1") User user1, @Param("user2") User user2);

    @Query("SELECT DISTINCT CASE WHEN m.sender = :user THEN m.recipient ELSE m.sender END " +
           "FROM Message m WHERE m.sender = :user OR m.recipient = :user")
    List<User> findConversationPartners(@Param("user") User user);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.recipient = :user AND m.read = false")
    long countUnreadMessages(@Param("user") User user);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.sender = :sender AND m.recipient = :recipient AND m.read = false")
    long countUnreadFromUser(@Param("sender") User sender, @Param("recipient") User recipient);

    @Modifying
    @Query("UPDATE Message m SET m.read = true WHERE m.sender = :sender AND m.recipient = :recipient AND m.read = false")
    void markConversationAsRead(@Param("sender") User sender, @Param("recipient") User recipient);
}
