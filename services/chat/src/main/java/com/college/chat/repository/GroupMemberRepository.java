package com.college.chat.repository;

import com.college.chat.model.GroupMember;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface GroupMemberRepository extends JpaRepository<GroupMember, Long> {
    List<GroupMember> findByUserId(Long userId);
    List<GroupMember> findByChatRoomId(Long chatRoomId);
    Optional<GroupMember> findByChatRoomIdAndUserId(Long chatRoomId, Long userId);
}
