package com.campus.intelligence.repository;

import com.campus.intelligence.model.StudentProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StudentProfileRepository extends JpaRepository<StudentProfile, Long> {
    Optional<StudentProfile> findByUserId(Long userId);
    Optional<StudentProfile> findByCollegeRollNumber(String collegeRollNumber);
    boolean existsByCollegeRollNumber(String collegeRollNumber);
}
