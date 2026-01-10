package com.college.chat.repository;

import com.college.chat.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByChatRoomIdOrderByTimestampAsc(Long chatRoomId);
    List<ChatMessage> findBySenderIdAndRecipientId(Long senderId, Long recipientId);
}
