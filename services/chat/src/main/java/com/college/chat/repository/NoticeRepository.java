package com.college.chat.repository;

import com.college.chat.model.Notice;
import com.college.chat.model.Notice.TargetRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NoticeRepository extends JpaRepository<Notice, Long> {

    // Find all active notices for a specific role (includes ALL role notices)
    @Query("SELECT n FROM Notice n WHERE n.isActive = true AND (n.targetRole = :role OR n.targetRole = 'ALL') AND n.groupId IS NULL ORDER BY n.createdAt DESC")
    List<Notice> findActiveNoticesForRole(@Param("role") TargetRole role);

    // Find all active notices for a group
    @Query("SELECT n FROM Notice n WHERE n.isActive = true AND n.groupId = :groupId ORDER BY n.createdAt DESC")
    List<Notice> findActiveNoticesByGroupId(@Param("groupId") Long groupId);

    // Find all notices created by a specific admin
    List<Notice> findByCreatedByOrderByCreatedAtDesc(Long createdBy);

    // Find all active notices (for admin view)
    List<Notice> findByIsActiveTrueOrderByCreatedAtDesc();

    // Count unread notices for a user (by role, excluding ones user has read)
    @Query("SELECT COUNT(n) FROM Notice n WHERE n.isActive = true AND (n.targetRole = :role OR n.targetRole = 'ALL') AND n.groupId IS NULL AND n.id NOT IN (SELECT nr.noticeId FROM NoticeRead nr WHERE nr.userId = :userId)")
    long countUnreadNoticesForUser(@Param("role") TargetRole role, @Param("userId") Long userId);
}
