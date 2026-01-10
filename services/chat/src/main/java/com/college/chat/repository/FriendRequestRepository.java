package com.college.chat.repository;

import com.college.chat.model.FriendRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FriendRequestRepository extends JpaRepository<FriendRequest, Long> {
    List<FriendRequest> findByReceiverIdAndStatus(Long receiverId, FriendRequest.RequestStatus status);
    List<FriendRequest> findBySenderIdAndStatus(Long senderId, FriendRequest.RequestStatus status);
}
