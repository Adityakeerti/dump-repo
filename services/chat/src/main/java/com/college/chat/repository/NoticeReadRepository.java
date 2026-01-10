package com.college.chat.repository;

import com.college.chat.model.NoticeRead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NoticeReadRepository extends JpaRepository<NoticeRead, Long> {

    // Check if user has read a specific notice
    Optional<NoticeRead> findByNoticeIdAndUserId(Long noticeId, Long userId);

    // Find all notices a user has read
    List<NoticeRead> findByUserId(Long userId);

    // Check if read record exists
    boolean existsByNoticeIdAndUserId(Long noticeId, Long userId);
}
