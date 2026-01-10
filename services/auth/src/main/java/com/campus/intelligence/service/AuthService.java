package com.campus.intelligence.service;

import com.campus.intelligence.dto.AuthResponse;
import com.campus.intelligence.dto.LoginRequest;
import com.campus.intelligence.dto.SignupRequest;
import com.campus.intelligence.model.StudentProfile;
import com.campus.intelligence.model.User;
import com.campus.intelligence.repository.StudentProfileRepository;
import com.campus.intelligence.repository.UserRepository;
import com.campus.intelligence.security.CustomUserDetails;
import com.campus.intelligence.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse signup(SignupRequest request) {
        // Check if email exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email is already in use!");
        }

        // Check if student ID exists
        if (studentProfileRepository.existsByCollegeRollNumber(request.getStudentId())) {
            throw new RuntimeException("Student ID is already registered!");
        }

        // Determine role (default to STUDENT if not specified)
        User.Role userRole = User.Role.STUDENT;
        if (request.getRole() != null && !request.getRole().isEmpty()) {
            try {
                userRole = User.Role.valueOf(request.getRole().toUpperCase());
            } catch (IllegalArgumentException e) {
                // Invalid role, default to STUDENT
                userRole = User.Role.STUDENT;
            }
        }

        // Create new user (main account)
        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .role(userRole)
                .isActive(true)
                .build();

        User savedUser = userRepository.save(user);

        // Create student profile (extended information)
        StudentProfile studentProfile = StudentProfile.builder()
                .userId(savedUser.getUserId())
                .collegeRollNumber(request.getStudentId())
                .phone(request.getPhone())
                .branchCode(request.getDepartment())
                .currentSemester(request.getSemester() != null && !request.getSemester().isEmpty() 
                    ? Integer.parseInt(request.getSemester()) 
                    : null)
                .build();

        StudentProfile savedProfile = studentProfileRepository.save(studentProfile);

        // Generate JWT token
        CustomUserDetails userDetails = new CustomUserDetails(savedUser);
        String token = jwtUtil.generateToken(userDetails);

        // Build response with combined data
        return AuthResponse.builder()
                .token(token)
                .type("Bearer")
                .id(savedUser.getUserId())
                .username(request.getUsername()) // For compatibility
                .email(savedUser.getEmail())
                .fullName(savedUser.getFullName())
                .studentId(savedProfile.getCollegeRollNumber())
                .role(savedUser.getRole())
                .message("User registered successfully!")
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        // Authenticate user
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsernameOrEmail(),
                        request.getPassword()
                )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);

        // Get user details
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        User user = userDetails.getUser();

        // Get student profile if exists
        StudentProfile profile = null;
        if (user.getRole() == User.Role.STUDENT) {
            profile = studentProfileRepository.findByUserId(user.getUserId()).orElse(null);
        }

        // Generate JWT token
        String token = jwtUtil.generateToken(userDetails);

        return AuthResponse.builder()
                .token(token)
                .type("Bearer")
                .id(user.getUserId())
                .username(request.getUsernameOrEmail()) // For compatibility
                .email(user.getEmail())
                .fullName(user.getFullName())
                .studentId(profile != null ? profile.getCollegeRollNumber() : null)
                .role(user.getRole())
                .message("Login successful!")
                .build();
    }
}
