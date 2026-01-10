package com.college.chat.service;

import com.college.chat.model.FriendRequest;
import com.college.chat.model.User;
import com.college.chat.repository.ChatRoomRepository;
import com.college.chat.repository.FriendRequestRepository;
import com.college.chat.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    private final ChatRoomRepository chatRoomRepository;
    private final com.college.chat.repository.GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final FriendRequestRepository friendRequestRepository;

    public UserService(UserRepository userRepository, 
                       FriendRequestRepository friendRequestRepository,
                       ChatRoomRepository chatRoomRepository,
                       com.college.chat.repository.GroupMemberRepository groupMemberRepository) {
        this.userRepository = userRepository;
        this.friendRequestRepository = friendRequestRepository;
        this.chatRoomRepository = chatRoomRepository;
        this.groupMemberRepository = groupMemberRepository;
    }

    @PostConstruct
    public void init() {
        // Seed users logic...
        // Note: For existing seeded users, we might want to run a migration or check on login, 
        // but for now, we'll just ensure NEW registrations get added.
    }

    public User register(User user) {
        Optional<User> existing = userRepository.findByEmail(user.getEmail());
        if (existing.isPresent()) {
            User existingUser = existing.get();
            // Update fields
            existingUser.setFullName(user.getFullName());
            existingUser.setPassword(user.getPassword());
            return userRepository.save(existingUser);
        }
        
        User savedUser = userRepository.save(user);
        
        // Auto-join Default College group
        chatRoomRepository.findByName("Default College").ifPresent(masterGroup -> {
            com.college.chat.model.GroupMember membership = com.college.chat.model.GroupMember.builder()
                .chatRoom(masterGroup)
                .user(savedUser)
                .joinedAt(new java.util.Date())
                .role(com.college.chat.model.GroupMember.Role.MEMBER)
                .build();
            groupMemberRepository.save(membership);
        });
        
        return savedUser;
    }

    public User login(String email, String password) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + email));
        
        if (!user.getPassword().equals(password)) {
            throw new RuntimeException("Invalid password");
        }
        
        user.setActive(true);
        return userRepository.save(user);
    }

    public void disconnect(String email) {
        userRepository.findByEmail(email).ifPresent(user -> {
            user.setActive(false);
            userRepository.save(user);
        });
    }

    public void sendFriendRequest(Long senderId, Long receiverId) {
        User sender = userRepository.findById(senderId).orElseThrow();
        User receiver = userRepository.findById(receiverId).orElseThrow();
        
        // Check if already friends or requested
        // Simplified for now
        FriendRequest request = FriendRequest.builder()
                .sender(sender)
                .receiver(receiver)
                .status(FriendRequest.RequestStatus.PENDING)
                .timestamp(new java.util.Date())
                .build();
        
        friendRequestRepository.save(request);
    }

    public void acceptFriendRequest(Long requestId) {
        FriendRequest request = friendRequestRepository.findById(requestId).orElseThrow();
        request.setStatus(FriendRequest.RequestStatus.ACCEPTED);
        friendRequestRepository.save(request);
        // No need to update user.getFriends() list since we derive it dynamically
    }

    public void removeFriend(Long userId, Long friendId) {
        // Find the accepted request between these two and delete it or set to REJECTED
        // This is a bit complex without a direct repository method for finding the request
        // For hackathon speed, skipping robust removal or implementing simple iteration
        List<FriendRequest> requests = friendRequestRepository.findAll(); 
        // Ideally: friendRequestRepository.findByUsers(userId, friendId);
        
        for (FriendRequest r : requests) {
            if (r.getStatus() == FriendRequest.RequestStatus.ACCEPTED) {
                boolean match1 = r.getSender().getId().equals(userId) && r.getReceiver().getId().equals(friendId);
                boolean match2 = r.getSender().getId().equals(friendId) && r.getReceiver().getId().equals(userId);
                if (match1 || match2) {
                    friendRequestRepository.delete(r);
                }
            }
        }
    }
    
    public List<User> getFriends(Long userId) {
         // Derive friends from ACCEPTED FriendRequests
         List<User> friends = new ArrayList<>();
         
         // 1. Where user is Sender
         List<FriendRequest> sent = friendRequestRepository.findBySenderIdAndStatus(userId, FriendRequest.RequestStatus.ACCEPTED);
         sent.forEach(r -> friends.add(r.getReceiver()));
         
         // 2. Where user is Receiver
         List<FriendRequest> received = friendRequestRepository.findByReceiverIdAndStatus(userId, FriendRequest.RequestStatus.ACCEPTED);
         received.forEach(r -> friends.add(r.getSender()));
         
         return friends;
    }
    
    public List<FriendRequest> getPendingRequests(Long userId) {
        return friendRequestRepository.findByReceiverIdAndStatus(userId, FriendRequest.RequestStatus.PENDING);
    }

    public List<FriendRequest> getSentRequests(Long userId) {
        return friendRequestRepository.findBySenderIdAndStatus(userId, FriendRequest.RequestStatus.PENDING);
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }
}
