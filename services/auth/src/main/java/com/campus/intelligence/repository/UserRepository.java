package com.campus.intelligence.repository;

import com.campus.intelligence.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    @Query("SELECT u FROM User u WHERE u.email = :email")
    Optional<User> findByEmail(@Param("email") String email);
    
    // Note: username is @Transient in User entity, so we search by email instead
    // This is used when login allows username/email - we treat both as email
    @Query("SELECT u FROM User u WHERE u.email = :emailOrUsername")
    Optional<User> findByUsername(@Param("emailOrUsername") String emailOrUsername);
    
    @Query("SELECT CASE WHEN COUNT(u) > 0 THEN true ELSE false END FROM User u WHERE u.email = :email")
    Boolean existsByEmail(@Param("email") String email);
    
    // Since username is @Transient, we can't query by it - skip this method
    // Return false always since we don't store usernames
    default Boolean existsByUsername(String username) {
        return false;
    }
}
