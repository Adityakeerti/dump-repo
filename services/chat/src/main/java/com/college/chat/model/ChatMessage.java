package com.college.chat.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Date;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Table(name = "group_message")
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "sender_id")
    private User sender;

    // For private messages
    @ManyToOne
    @JoinColumn(name = "recipient_id")
    private User recipient;

    // For group messages
    @ManyToOne
    @JoinColumn(name = "chat_room_id")
    private ChatRoom chatRoom;

    @Column(columnDefinition = "TEXT")
    private String content;

    private Date timestamp;

    @Enumerated(EnumType.STRING)
    private MessageType type;

    @OneToOne
    @JoinColumn(name = "reply_to_id")
    private ChatMessage replyTo;
}
