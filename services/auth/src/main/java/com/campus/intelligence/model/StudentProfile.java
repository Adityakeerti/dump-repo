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
@Table(name = "student_profiles")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentProfile {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "profile_id")
    private Long profileId;
    
    @Column(name = "user_id", unique = true, nullable = false)
    private Long userId;
    
    @Column(name = "college_roll_number", unique = true, nullable = false, length = 50)
    private String collegeRollNumber;
    
    @Column(name = "current_semester")
    private Integer currentSemester;
    
    @Column(name = "branch_code", length = 50)
    private String branchCode;
    
    @Column(name = "batch_year")
    private Integer batchYear;
    
    @Column(length = 15)
    private String phone;
    
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @OneToOne
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;
}
