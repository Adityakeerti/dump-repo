package com.college.chat.controller;

import com.college.chat.model.Notice;
import com.college.chat.model.Notice.TargetRole;
import com.college.chat.service.NoticeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notices")
@RequiredArgsConstructor
public class NoticeController {

    private final NoticeService noticeService;

    // DTO for creating notices
    public record CreateNoticeRequest(
        String title,
        String content,
        String targetRole,  // ALL, STUDENT, FACULTY, MODERATOR, ADMIN
        Long groupId,       // Optional: for group-specific notices
        Long createdBy,
        String createdByName
    ) {}

    // Create a new notice (admin only)
    @PostMapping
    public ResponseEntity<?> createNotice(@RequestBody CreateNoticeRequest request) {
        try {
            System.out.println("📝 Creating notice: " + request.title() + " for role: " + request.targetRole());
            TargetRole role = TargetRole.valueOf(request.targetRole().toUpperCase());
            Notice notice = noticeService.createNotice(
                request.title(),
                request.content(),
                role,
                request.groupId(),
                request.createdBy(),
                request.createdByName()
            );
            System.out.println("✅ Notice created with ID: " + notice.getId());
            return ResponseEntity.ok(notice);
        } catch (IllegalArgumentException e) {
            System.err.println("❌ Invalid role: " + e.getMessage());
            return ResponseEntity.badRequest().body("Invalid target role: " + request.targetRole());
        } catch (Exception e) {
            System.err.println("❌ Error creating notice: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }

    // Get notices for current user's role
    @GetMapping
    public ResponseEntity<List<Notice>> getNoticesForRole(@RequestParam String role) {
        try {
            List<Notice> notices = noticeService.getNoticesForRole(role);
            return ResponseEntity.ok(notices);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // Get notices for a specific group
    @GetMapping("/group/{groupId}")
    public ResponseEntity<List<Notice>> getGroupNotices(@PathVariable Long groupId) {
        List<Notice> notices = noticeService.getNoticesForGroup(groupId);
        return ResponseEntity.ok(notices);
    }

    // Get all notices (admin view)
    @GetMapping("/all")
    public ResponseEntity<List<Notice>> getAllNotices() {
        List<Notice> notices = noticeService.getAllActiveNotices();
        return ResponseEntity.ok(notices);
    }

    // Get notices created by specific admin
    @GetMapping("/my-notices")
    public ResponseEntity<List<Notice>> getMyNotices(@RequestParam Long adminId) {
        List<Notice> notices = noticeService.getNoticesByAdmin(adminId);
        return ResponseEntity.ok(notices);
    }

    // Mark notice as read
    @PutMapping("/{noticeId}/read")
    public ResponseEntity<Map<String, Object>> markAsRead(
            @PathVariable Long noticeId,
            @RequestParam Long userId) {
        noticeService.markAsRead(noticeId, userId);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("noticeId", noticeId);
        return ResponseEntity.ok(response);
    }

    // Get unread count
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Object>> getUnreadCount(
            @RequestParam String role,
            @RequestParam Long userId) {
        long count = noticeService.getUnreadCount(role, userId);
        Map<String, Object> response = new HashMap<>();
        response.put("unreadCount", count);
        return ResponseEntity.ok(response);
    }

    // Delete a notice (soft delete)
    @DeleteMapping("/{noticeId}")
    public ResponseEntity<Map<String, Object>> deleteNotice(
            @PathVariable Long noticeId,
            @RequestParam Long adminId) {
        boolean deleted = noticeService.deleteNotice(noticeId, adminId);
        Map<String, Object> response = new HashMap<>();
        response.put("success", deleted);
        if (!deleted) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(response);
    }

    // Get single notice by ID
    @GetMapping("/{noticeId}")
    public ResponseEntity<Notice> getNoticeById(@PathVariable Long noticeId) {
        return noticeService.getNoticeById(noticeId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
