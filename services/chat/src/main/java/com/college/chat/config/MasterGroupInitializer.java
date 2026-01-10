package com.college.chat.config;

import com.college.chat.model.ChatRoom;
import com.college.chat.repository.ChatRoomRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Optional;

@Configuration
public class MasterGroupInitializer {

    // Logic: "Default College" group in `groups` table acts as Master Group.
    // It is created by the schema script with ID 1.
    // We just verify its existence or look it up by name.

    @Bean
    public CommandLineRunner initMasterGroup(ChatRoomRepository chatRoomRepository) {
        return args -> {
            Optional<ChatRoom> masterGroup = chatRoomRepository.findByName("Default College");
            if (masterGroup.isPresent()) {
                 System.out.println("MASTER GROUP ('Default College') found.");
            } else {
                System.out.println("WARNING: Master Group 'Default College' not found. Ensure Schema.sql was executed.");
                // We do NOT create it here because we are in 'ddl-auto=none' mode and respect existing data.
            }
        };
    }
}
