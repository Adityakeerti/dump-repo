package com.campus.intelligence.controller;

import com.campus.intelligence.dto.AuthResponse;
import com.campus.intelligence.dto.LoginRequest;
import com.campus.intelligence.dto.SignupRequest;
import com.campus.intelligence.model.User;
import com.campus.intelligence.model.UserSession;
import com.campus.intelligence.repository.UserRepository;
import com.campus.intelligence.repository.UserSessionRepository;
import com.campus.intelligence.service.AuthService;
import com.campus.intelligence.service.SessionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthService authService;
    private final SessionService sessionService;
    private final UserRepository userRepository;
    private final UserSessionRepository sessionRepository;

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@Valid @RequestBody SignupRequest request, HttpServletRequest httpRequest) {
        try {
            AuthResponse response = authService.signup(request);
            
            // Create session for the new user
            Optional<User> userOpt = userRepository.findByEmail(request.getEmail());
            if (userOpt.isPresent()) {
                String contextType = request.getRole() != null && !"STUDENT".equals(request.getRole()) 
                    ? "MANAGEMENT" : "STUDENT";
                UserSession session = sessionService.createSession(
                    userOpt.get(),
                    response.getToken(),
                    contextType,
                    getClientIp(httpRequest),
                    httpRequest.getHeader("User-Agent")
                );
                response.setSessionId(session.getSessionId());
            }
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        try {
            AuthResponse response = authService.login(request);
            
            // Create session for the logged in user
            Optional<User> userOpt = userRepository.findByEmail(request.getUsernameOrEmail());
            if (!userOpt.isPresent()) {
                userOpt = userRepository.findByUsername(request.getUsernameOrEmail());
            }
            
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                String contextType = user.getRole() != null && !"STUDENT".equals(user.getRole().name()) 
                    ? "MANAGEMENT" : "STUDENT";
                UserSession session = sessionService.createSession(
                    user,
                    response.getToken(),
                    contextType,
                    getClientIp(httpRequest),
                    httpRequest.getHeader("User-Agent")
                );
                response.setSessionId(session.getSessionId());
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Invalid username/email or password");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
        }
    }

    /**
     * Validate a session and return user data if valid
     */
    @PostMapping("/validate-session")
    public ResponseEntity<?> validateSession(@RequestBody Map<String, String> request) {
        String sessionId = request.get("sessionId");
        
        if (sessionId == null || sessionId.isEmpty()) {
            return ResponseEntity.ok(Map.of("valid", false, "error", "Missing sessionId"));
        }
        
        Optional<UserSession> sessionOpt = sessionService.validateSession(sessionId);
        
        if (sessionOpt.isPresent()) {
            UserSession session = sessionOpt.get();
            Optional<User> userOpt = userRepository.findById(session.getUserId());
            
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                Map<String, Object> response = new HashMap<>();
                response.put("valid", true);
                response.put("sessionId", session.getSessionId());
                response.put("contextType", session.getContextType().name());
                response.put("token", session.getToken());
                
                // Build user map - use email as username since username is @Transient
                Map<String, Object> userMap = new HashMap<>();
                userMap.put("id", user.getUserId());
                userMap.put("username", user.getEmail()); // Use email as username
                userMap.put("email", user.getEmail());
                userMap.put("fullName", user.getFullName());
                userMap.put("role", user.getRole().name());
                response.put("user", userMap);
                
                return ResponseEntity.ok(response);
            }
        }
        
        return ResponseEntity.ok(Map.of("valid", false, "error", "Session expired or invalid"));
    }

    /**
     * Logout - invalidate session
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestBody Map<String, String> request) {
        String sessionId = request.get("sessionId");
        
        Map<String, Object> response = new HashMap<>();
        
        if (sessionId != null && !sessionId.isEmpty()) {
            // Check if session exists before invalidating
            Optional<UserSession> sessionOpt = sessionRepository.findBySessionIdAndActive(sessionId);
            
            if (sessionOpt.isPresent()) {
                UserSession session = sessionOpt.get();
                sessionService.invalidateSession(sessionId);
                response.put("success", true);
                response.put("message", "Session invalidated successfully");
                response.put("sessionId", sessionId);
                response.put("userId", session.getUserId());
            } else {
                // Session not found or already inactive
                response.put("success", true);
                response.put("message", "Session not found or already invalidated");
                response.put("sessionId", sessionId);
            }
        } else {
            response.put("success", false);
            response.put("message", "Session ID is required");
        }
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "UP");
        response.put("message", "Campus Intelligence Backend is running!");
        return ResponseEntity.ok(response);
    }
    
    /**
     * Get client IP address handling proxies
     */
    private String getClientIp(HttpServletRequest request) {
        String[] headers = {"X-Forwarded-For", "X-Real-IP", "Proxy-Client-IP", "WL-Proxy-Client-IP"};
        for (String header : headers) {
            String ip = request.getHeader(header);
            if (ip != null && !ip.isEmpty() && !"unknown".equalsIgnoreCase(ip)) {
                return ip.split(",")[0].trim();
            }
        }
        return request.getRemoteAddr();
    }
}
