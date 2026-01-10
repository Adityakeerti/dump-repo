package com.campus.intelligence.repository;

import com.campus.intelligence.model.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserSessionRepository extends JpaRepository<UserSession, String> {
    
    @Query("SELECT s FROM UserSession s WHERE s.sessionId = :sessionId AND s.isActive = true")
    Optional<UserSession> findBySessionIdAndActive(@Param("sessionId") String sessionId);
    
    @Query("SELECT s FROM UserSession s WHERE s.userId = :userId AND s.isActive = true")
    List<UserSession> findByUserIdAndActive(@Param("userId") Long userId);
    
    @Query("SELECT s FROM UserSession s WHERE s.userId = :userId AND s.contextType = :contextType AND s.isActive = true")
    List<UserSession> findByUserIdAndContextTypeAndActive(@Param("userId") Long userId, @Param("contextType") UserSession.ContextType contextType);
    
    @Modifying
    @Query("UPDATE UserSession s SET s.lastAccessed = :now WHERE s.sessionId = :sessionId")
    void updateLastAccessed(@Param("sessionId") String sessionId, @Param("now") LocalDateTime now);
    
    @Modifying
    @Query("UPDATE UserSession s SET s.isActive = false WHERE s.expiresAt < :now")
    void deactivateExpiredSessions(@Param("now") LocalDateTime now);
    
    @Modifying
    @Query("UPDATE UserSession s SET s.isActive = false WHERE s.sessionId = :sessionId")
    void deactivateSession(@Param("sessionId") String sessionId);
    
    @Modifying
    @Query("UPDATE UserSession s SET s.isActive = false WHERE s.userId = :userId")
    void deactivateAllUserSessions(@Param("userId") Long userId);
    
    @Modifying
    @Query("UPDATE UserSession s SET s.isActive = false WHERE s.userId = :userId AND s.contextType = :contextType")
    void deactivateUserSessionsByContext(@Param("userId") Long userId, @Param("contextType") UserSession.ContextType contextType);
}
