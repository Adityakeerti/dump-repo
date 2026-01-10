package com.campus.intelligence.dto;

import com.campus.intelligence.model.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {
    private String token;
    private String type = "Bearer";
    private Long id;
    private String username;
    private String email;
    private String fullName;
    private String studentId;
    private User.Role role;
    private String message;
    private String sessionId; // For persistent session management
}
