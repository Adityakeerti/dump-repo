package com.college.chat.controller;

import com.college.chat.dto.ChatMessageRequest;
import com.college.chat.model.ChatMessage;
import com.college.chat.model.ChatRoom;
import com.college.chat.model.MessageType;
import com.college.chat.model.User;
import com.college.chat.repository.ChatMessageRepository;
import com.college.chat.repository.ChatRoomRepository;
import com.college.chat.repository.UserRepository;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.Date;
import java.util.List;
import java.util.Optional;

@Controller
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final UserRepository userRepository;

    public ChatController(SimpMessagingTemplate messagingTemplate,
                          ChatMessageRepository chatMessageRepository,
                          ChatRoomRepository chatRoomRepository,
                          UserRepository userRepository) {
        this.messagingTemplate = messagingTemplate;
        this.chatMessageRepository = chatMessageRepository;
        this.chatRoomRepository = chatRoomRepository;
        this.userRepository = userRepository;
    }

    @MessageMapping("/chat.sendMessage/{roomId}")
    public void sendMessage(@DestinationVariable String roomId, @Payload ChatMessageRequest request) {
        // roomId is either a Group ID (Long) or "MASTER_GROUP" mapping to "Default College"
        ChatRoom chatRoom;
        String topicDestination;

        if ("MASTER_GROUP".equals(roomId)) {
             chatRoom = chatRoomRepository.findByName("Default College")
                .orElseThrow(() -> new RuntimeException("Master Group not found"));
             topicDestination = "/topic/room/MASTER_GROUP";
        } else {
             try {
                Long id = Long.parseLong(roomId);
                chatRoom = chatRoomRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Room not found"));
                
                // CRITICAL FIX: If this ID resolves to Default College, FORCE the common topic
                if ("Default College".equals(chatRoom.getName()) || "Master Group".equals(chatRoom.getName())) {
                    topicDestination = "/topic/room/MASTER_GROUP";
                } else {
                    topicDestination = "/topic/room/" + chatRoom.getId();
                }
            } catch (NumberFormatException e) {
                 throw new RuntimeException("Invalid Room ID: " + roomId);
            }
        }
        
        User sender = userRepository.findById(request.getSenderId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        ChatMessage.ChatMessageBuilder builder = ChatMessage.builder()
                .chatRoom(chatRoom)
                .sender(sender)
                .content(request.getContent())
                .timestamp(new Date())
                .type(MessageType.valueOf(request.getType()));
                
        if (request.getReplyToId() != null) {
            chatMessageRepository.findById(request.getReplyToId()).ifPresent(builder::replyTo);
        }
        
        ChatMessage chatMessage = builder.build();
        
        chatMessageRepository.save(chatMessage);
        
        // Broadcast to specific room topic
        messagingTemplate.convertAndSend(topicDestination, chatMessage);
    }

    @MessageMapping("/chat.sendPrivateMessage")
    public void sendPrivateMessage(@Payload ChatMessageRequest request) {
        User sender = userRepository.findById(request.getSenderId())
                .orElseThrow(() -> new RuntimeException("Sender not found"));
        
        User recipient = userRepository.findById(request.getRecipientId())
                .orElseThrow(() -> new RuntimeException("Recipient not found"));
        
        ChatMessage.ChatMessageBuilder builder = ChatMessage.builder()
                .sender(sender)
                .recipient(recipient)
                .content(request.getContent())
                .timestamp(new Date())
                .type(MessageType.valueOf(request.getType()));
                
        if (request.getReplyToId() != null) {
            chatMessageRepository.findById(request.getReplyToId()).ifPresent(builder::replyTo);
        }
        
        ChatMessage chatMessage = builder.build();
        
        chatMessageRepository.save(chatMessage);
        
        messagingTemplate.convertAndSend("/topic/private/" + recipient.getId(), chatMessage);
        messagingTemplate.convertAndSend("/topic/private/" + sender.getId(), chatMessage);
    }
    
    @MessageMapping("/chat.addUser")
    public void addUser(@Payload User user) {
        if (user.getId() != null) {
            userRepository.findById(user.getId()).ifPresent(u -> {
                u.setActive(true);
                userRepository.save(u);
            });
        } else if (user.getEmail() != null) {
             userRepository.findByEmail(user.getEmail()).ifPresent(u -> {
                u.setActive(true);
                userRepository.save(u);
             });
        }
    }
}
