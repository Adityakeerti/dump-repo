package com.campus.intelligence.service;

import com.campus.intelligence.model.User;
import com.campus.intelligence.model.UserSession;
import com.campus.intelligence.repository.UserSessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Optional;

@Service
public class SessionService {
    
    private static final int SESSION_DURATION_DAYS = 7; // Sessions last 7 days
    private static final SecureRandom secureRandom = new SecureRandom();
    
    @Autowired
    private UserSessionRepository sessionRepository;
    
    /**
     * Generate a secure random session ID
     */
    private String generateSessionId() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
    
    /**
     * Create a new session for a user
     */
    @Transactional
    public UserSession createSession(User user, String token, String contextType, String ipAddress, String userAgent) {
        // Determine context type
        UserSession.ContextType context = "MANAGEMENT".equalsIgnoreCase(contextType) 
            ? UserSession.ContextType.MANAGEMENT 
            : UserSession.ContextType.STUDENT;
        
        // Optionally deactivate previous sessions for this context
        // (Uncomment if you want single session per context)
        // sessionRepository.deactivateUserSessionsByContext(user.getUserId(), context);
        
        // Create new session
        UserSession session = new UserSession();
        session.setSessionId(generateSessionId());
        session.setUserId(user.getUserId());
        session.setContextType(context);
        session.setToken(token);
        session.setCreatedAt(LocalDateTime.now());
        session.setExpiresAt(LocalDateTime.now().plusDays(SESSION_DURATION_DAYS));
        session.setLastAccessed(LocalDateTime.now());
        session.setIpAddress(ipAddress);
        session.setUserAgent(userAgent != null && userAgent.length() > 255 ? userAgent.substring(0, 255) : userAgent);
        session.setIsActive(true);
        
        return sessionRepository.save(session);
    }
    
    /**
     * Validate a session and update last accessed time
     */
    @Transactional
    public Optional<UserSession> validateSession(String sessionId) {
        Optional<UserSession> sessionOpt = sessionRepository.findBySessionIdAndActive(sessionId);
        
        if (sessionOpt.isPresent()) {
            UserSession session = sessionOpt.get();
            
            // Check if session is expired
            if (session.isExpired()) {
                session.setIsActive(false);
                sessionRepository.save(session);
                return Optional.empty();
            }
            
            // Update last accessed time
            session.setLastAccessed(LocalDateTime.now());
            sessionRepository.save(session);
            
            return Optional.of(session);
        }
        
        return Optional.empty();
    }
    
    /**
     * Invalidate (logout) a session
     */
    @Transactional
    public void invalidateSession(String sessionId) {
        sessionRepository.deactivateSession(sessionId);
    }
    
    /**
     * Logout from all sessions for a user
     */
    @Transactional
    public void invalidateAllUserSessions(Long userId) {
        sessionRepository.deactivateAllUserSessions(userId);
    }
    
    /**
     * Cleanup expired sessions (can be called by a scheduled job)
     */
    @Transactional
    public void cleanupExpiredSessions() {
        sessionRepository.deactivateExpiredSessions(LocalDateTime.now());
    }
}
