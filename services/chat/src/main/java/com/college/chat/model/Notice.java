package com.college.chat.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Table(name = "notices")
public class Notice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_role", nullable = false)
    private TargetRole targetRole;

    @Column(name = "group_id")
    private Long groupId; // Optional: for group-specific notices

    @Column(name = "created_by", nullable = false)
    private Long createdBy; // Admin user ID who created

    @Column(name = "created_by_name")
    private String createdByName; // Admin name for display

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "is_active")
    @Builder.Default
    private boolean isActive = true;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    // Target role enum
    public enum TargetRole {
        ALL,        // Everyone sees it
        STUDENT,    // Only students
        FACULTY,    // Only teachers
        MODERATOR,  // Only moderators/ERP admins
        ADMIN       // Only other admins
    }
}
