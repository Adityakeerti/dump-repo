package com.campus.intelligence.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long userId;
    
    @Column(unique = true, nullable = false, length = 150)
    private String email;
    
    @Column(name = "password_hash", nullable = false)
    private String password;
    
    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role = Role.STUDENT;
    
    @Column(name = "profile_image_url", columnDefinition = "TEXT")
    private String profileImageUrl;
    
    @Column(name = "is_active")
    private Boolean isActive = true;
    
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Transient fields for compatibility with existing signup/login
    @Transient
    private String username;
    
    @Transient
    private String studentId;
    
    @Transient
    private String phone;
    
    @Transient
    private String department;
    
    @Transient
    private String semester;
    
    public enum Role {
        STUDENT,
        ADMIN,
        FACULTY,
        LIBRARIAN,
        MODERATOR
    }
    
    // For backward compatibility - map ID
    public Long getId() {
        return userId;
    }
    
    public void setId(Long id) {
        this.userId = id;
    }
}
