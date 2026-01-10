package com.campus.intelligence.repository;

import com.campus.intelligence.model.LibraryTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LibraryTransactionRepository extends JpaRepository<LibraryTransaction, Long> {
    
    @Query("SELECT t FROM LibraryTransaction t WHERE t.userId = :userId")
    List<LibraryTransaction> findByUserId(@Param("userId") Long userId);
    
    @Query("SELECT t FROM LibraryTransaction t WHERE t.bookId = :bookId")
    List<LibraryTransaction> findByBookId(@Param("bookId") Long bookId);
    
    @Query("SELECT t FROM LibraryTransaction t WHERE t.status = :status")
    List<LibraryTransaction> findByStatus(@Param("status") LibraryTransaction.Status status);
    
    @Query("SELECT t FROM LibraryTransaction t WHERE t.userId = :userId AND t.status = :status")
    List<LibraryTransaction> findByUserIdAndStatus(@Param("userId") Long userId, @Param("status") LibraryTransaction.Status status);
    
    @Query("SELECT t FROM LibraryTransaction t WHERE t.bookId = :bookId AND t.status = :status")
    Optional<LibraryTransaction> findByBookIdAndStatus(@Param("bookId") Long bookId, @Param("status") LibraryTransaction.Status status);
}
