package com.college.chat.controller;

import com.college.chat.model.ChatMessage;
import com.college.chat.model.ChatRoom;
import com.college.chat.model.User;
import com.college.chat.repository.ChatMessageRepository;
import com.college.chat.repository.ChatRoomRepository;
import com.college.chat.service.GroupService;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api")
public class ResourceController {

    private final com.college.chat.service.UserService userService;
    private final GroupService groupService;
    private final ChatRoomRepository chatRoomRepository;
    private final ChatMessageRepository chatMessageRepository;

    public ResourceController(com.college.chat.service.UserService userService,
                              GroupService groupService,
                              ChatRoomRepository chatRoomRepository,
                              ChatMessageRepository chatMessageRepository) {
        this.userService = userService;
        this.groupService = groupService;
        this.chatRoomRepository = chatRoomRepository;
        this.chatMessageRepository = chatMessageRepository;
    }

    @GetMapping("/users")
    public List<User> getAllUsers() {
        return userService.getAllUsers();
    }

    @GetMapping("/rooms")
    public List<ChatRoom> getChatRooms() {
        return chatRoomRepository.findAll();
    }

    @GetMapping("/history/room/{roomId}")
    public List<ChatMessage> getGroupHistory(@PathVariable String roomId) {
        Long id;
        ChatRoom room;
        try {
            if ("MASTER_GROUP".equals(roomId)) {
                 room = chatRoomRepository.findByName("Default College")
                    .orElseThrow(() -> new RuntimeException("Master Group not found"));
            } else {
                id = Long.parseLong(roomId);
                room = chatRoomRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Room not found: " + roomId));
            }
        } catch (NumberFormatException e) {
             // Fallback: If it's a string name, try to find by name (unlikely for group ID but safe)
             room = chatRoomRepository.findByName(roomId)
                 .orElseThrow(() -> new RuntimeException("Room not found: " + roomId));
        }
        return chatMessageRepository.findByChatRoomIdOrderByTimestampAsc(room.getId());
    }

    @GetMapping("/history/private/{senderId}/{recipientId}")
    public List<ChatMessage> getPrivateHistory(@PathVariable Long senderId, @PathVariable Long recipientId) {
        List<ChatMessage> all = chatMessageRepository.findAll();
        return all.stream()
                .filter(m ->
                    (m.getSender() != null && m.getRecipient() != null) &&
                    ((m.getSender().getId().equals(senderId) && m.getRecipient().getId().equals(recipientId)) ||
                     (m.getSender().getId().equals(recipientId) && m.getRecipient().getId().equals(senderId)))
                )
                .sorted(Comparator.comparing(ChatMessage::getTimestamp))
                .toList();
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            return ResponseEntity.ok(userService.login(request.getEmail(), request.getPassword()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(401).body(e.getMessage());
        }
    }
    
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        return ResponseEntity.ok(userService.register(user));
    }

    @PostMapping("/friends/add")
    public void sendFriendRequest(@RequestParam Long senderId, @RequestParam Long receiverId) {
        userService.sendFriendRequest(senderId, receiverId);
    }

    @PostMapping("/friends/accept")
    public void acceptFriendRequest(@RequestParam Long requestId) {
         userService.acceptFriendRequest(requestId);
    }
    
    @PostMapping("/friends/remove")
    public void removeFriend(@RequestParam Long userId, @RequestParam Long friendId) {
        userService.removeFriend(userId, friendId);
    }
    
    @GetMapping("/friends/{userId}")
    public List<User> getFriends(@PathVariable Long userId) {
        return userService.getFriends(userId);
    }
    
    @GetMapping("/friends/requests/{userId}")
    public List<com.college.chat.model.FriendRequest> getFriendRequests(@PathVariable Long userId) {
        return userService.getPendingRequests(userId);
    }
    
    @GetMapping("/friends/sent/{userId}")
    public List<com.college.chat.model.FriendRequest> getSentRequests(@PathVariable Long userId) {
        return userService.getSentRequests(userId);
    }
    
    // Group Management
    @PostMapping("/groups/create")
    public ResponseEntity<ChatRoom> createGroup(@RequestBody CreateGroupRequest request) {
        ChatRoom group = groupService.createGroup(request.getName(), request.getDescription(), request.getCreatorId(), request.getMemberIds());
        return ResponseEntity.ok(group);
    }
    
    @PostMapping("/groups/{groupId}/members")
    public void addGroupMember(@PathVariable Long groupId, @RequestParam Long userId) {
        groupService.addMember(groupId, userId);
    }
    
    @DeleteMapping("/groups/{groupId}/members/{userId}")
    public void removeGroupMember(@PathVariable Long groupId, @PathVariable Long userId) {
        groupService.removeMember(groupId, userId);
    }
    
    @PostMapping("/groups/leave")
    public ResponseEntity<?> leaveGroup(@RequestParam Long groupId, @RequestParam Long userId) {
        try {
            groupService.removeMember(groupId, userId);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    @GetMapping("/groups/{groupId}/members")
    public List<User> getGroupMembers(@PathVariable Long groupId) {
        return groupService.getMembers(groupId);
    }
    
    @GetMapping("/groups/user/{userId}")
    public List<ChatRoom> getUserGroups(@PathVariable Long userId) {
        return groupService.getUserGroups(userId);
    }
    
    // User Management
    @PostMapping("/logout")
    public void logout(@RequestParam Long userId) {
        userService.disconnect(userService.getAllUsers().stream()
                .filter(u -> u.getId().equals(userId))
                .findFirst()
                .orElseThrow()
                .getEmail());
    }
    
    @GetMapping("/users/search")
    public List<User> searchUsers(@RequestParam String query) {
        if (query == null || query.trim().isEmpty()) return List.of();
        String q = query.toLowerCase();
        return userService.getAllUsers().stream()
                .filter(u -> (u.getFullName() != null && u.getFullName().toLowerCase().contains(q)) ||
                            (u.getEmail() != null && u.getEmail().toLowerCase().contains(q)))
                .toList();
    }
    
    @GetMapping("/users/all")
    public List<User> getFilteredUsers() {
        // Return all STUDENT and FACULTY/TEACHER users for group creation
        List<User> allUsers = userService.getAllUsers();
        System.out.println("[DEBUG] Total users in database: " + allUsers.size());
        
        List<User> filtered = allUsers.stream()
                .filter(u -> {
                    String role = u.getRole() != null ? u.getRole().toString() : "NULL";
                    System.out.println("[DEBUG] User: " + u.getEmail() + " | Role: " + role);
                    
                    if (u.getRole() == null) return false;
                    String roleStr = u.getRole().toString();
                    return roleStr.equals("STUDENT") || roleStr.equals("FACULTY") || roleStr.equals("TEACHER");
                })
                .toList();
        
        System.out.println("[DEBUG] Filtered users: " + filtered.size());
        return filtered;
    }

    @Data
    static class LoginRequest {
        private String email;
        private String password;
    }
    
    @Data
    static class CreateGroupRequest {
        private String name;
        private String description;
        private Long creatorId;
        private List<Long> memberIds;
    }
}
