package com.college.chat.dto;

import lombok.Data;

@Data
public class ChatMessageRequest {
    private Long senderId;
    private Long recipientId; // For private
    private String content;
    private String type; // CHAT, JOIN, LEAVE
    private Long replyToId; // Optional: ID of message being replied to
}
