package com.campus.intelligence.controller;

import com.campus.intelligence.model.User;
import com.campus.intelligence.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Controller for user-related endpoints.
 */
@RestController
@RequestMapping("/users")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    /**
     * Get all users (for library book issue dropdown)
     */
    @GetMapping
    public ResponseEntity<?> getAllUsers() {
        List<User> users = userRepository.findAll();
        
        // Map to simplified response (don't expose password hash)
        List<Map<String, Object>> userList = users.stream()
            .filter(u -> u.getIsActive() != null && u.getIsActive())
            .map(u -> {
                Map<String, Object> userMap = new HashMap<>();
                userMap.put("userId", u.getUserId());
                userMap.put("id", u.getUserId()); // Alias for frontend compatibility
                userMap.put("fullName", u.getFullName());
                userMap.put("name", u.getFullName()); // Alias
                userMap.put("email", u.getEmail());
                userMap.put("role", u.getRole().name());
                return userMap;
            })
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(userList);
    }

    /**
     * Get users by role (e.g., students only for library issue)
     */
    @GetMapping("/role/{role}")
    public ResponseEntity<?> getUsersByRole(@PathVariable String role) {
        List<User> users = userRepository.findAll();
        
        List<Map<String, Object>> userList = users.stream()
            .filter(u -> u.getIsActive() != null && u.getIsActive())
            .filter(u -> u.getRole().name().equalsIgnoreCase(role))
            .map(u -> {
                Map<String, Object> userMap = new HashMap<>();
                userMap.put("userId", u.getUserId());
                userMap.put("id", u.getUserId());
                userMap.put("fullName", u.getFullName());
                userMap.put("name", u.getFullName());
                userMap.put("email", u.getEmail());
                userMap.put("role", u.getRole().name());
                return userMap;
            })
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(userList);
    }
}
