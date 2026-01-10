package com.college.chat.service;

import com.college.chat.model.Notice;
import com.college.chat.model.Notice.TargetRole;
import com.college.chat.model.NoticeRead;
import com.college.chat.repository.NoticeRepository;
import com.college.chat.repository.NoticeReadRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class NoticeService {

    private final NoticeRepository noticeRepository;
    private final NoticeReadRepository noticeReadRepository;

    // Create a new notice (admin only)
    @Transactional
    public Notice createNotice(String title, String content, TargetRole targetRole, 
                                Long groupId, Long createdBy, String createdByName) {
        Notice notice = Notice.builder()
                .title(title)
                .content(content)
                .targetRole(targetRole)
                .groupId(groupId)
                .createdBy(createdBy)
                .createdByName(createdByName)
                .isActive(true)
                .build();
        return noticeRepository.save(notice);
    }

    // Get notices for a specific role
    public List<Notice> getNoticesForRole(String roleStr) {
        TargetRole role = TargetRole.valueOf(roleStr.toUpperCase());
        return noticeRepository.findActiveNoticesForRole(role);
    }

    // Get notices for a group
    public List<Notice> getNoticesForGroup(Long groupId) {
        return noticeRepository.findActiveNoticesByGroupId(groupId);
    }

    // Get all notices created by an admin
    public List<Notice> getNoticesByAdmin(Long adminId) {
        return noticeRepository.findByCreatedByOrderByCreatedAtDesc(adminId);
    }

    // Get all active notices (for admin dashboard)
    public List<Notice> getAllActiveNotices() {
        return noticeRepository.findByIsActiveTrueOrderByCreatedAtDesc();
    }

    // Mark notice as read
    @Transactional
    public void markAsRead(Long noticeId, Long userId) {
        if (!noticeReadRepository.existsByNoticeIdAndUserId(noticeId, userId)) {
            NoticeRead noticeRead = NoticeRead.builder()
                    .noticeId(noticeId)
                    .userId(userId)
                    .build();
            noticeReadRepository.save(noticeRead);
        }
    }

    // Check if user has read a notice
    public boolean hasUserRead(Long noticeId, Long userId) {
        return noticeReadRepository.existsByNoticeIdAndUserId(noticeId, userId);
    }

    // Get unread count for user
    public long getUnreadCount(String roleStr, Long userId) {
        TargetRole role = TargetRole.valueOf(roleStr.toUpperCase());
        return noticeRepository.countUnreadNoticesForUser(role, userId);
    }

    // Delete/deactivate a notice
    @Transactional
    public boolean deleteNotice(Long noticeId, Long adminId) {
        Optional<Notice> noticeOpt = noticeRepository.findById(noticeId);
        if (noticeOpt.isPresent()) {
            Notice notice = noticeOpt.get();
            // Only the creator or any admin can delete
            notice.setActive(false);
            noticeRepository.save(notice);
            return true;
        }
        return false;
    }

    // Get notice by ID
    public Optional<Notice> getNoticeById(Long id) {
        return noticeRepository.findById(id);
    }
}
