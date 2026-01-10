package com.campus.intelligence.controller;

import com.campus.intelligence.model.Book;
import com.campus.intelligence.model.LibraryTransaction;
import com.campus.intelligence.repository.BookRepository;
import com.campus.intelligence.repository.LibraryTransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Controller for handling library barcode scan data from mobile devices.
 * This provides real-time communication between mobile scanner and PC dashboard.
 */
@RestController
@RequestMapping("/library")  // URL will be /api/library due to context-path
@CrossOrigin(origins = "*")
public class LibraryScanController {

    @Autowired
    private BookRepository bookRepository;
    
    @Autowired
    private LibraryTransactionRepository transactionRepository;

    // In-memory storage for scan data (per-session, could be enhanced with session IDs)
    private static final Map<String, Object> latestScanData = new ConcurrentHashMap<>();
    private static volatile long lastScanTimestamp = 0;

    /**
     * Test endpoint to verify connection
     */
    @GetMapping("/test")
    public ResponseEntity<?> testConnection() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "connected");
        response.put("message", "Library scan service is running");
        response.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(response);
    }

    /**
     * Endpoint for PC dashboard to poll for latest scan data
     */
    @GetMapping("/latest-scan")
    public ResponseEntity<?> getLatestScan() {
        if (latestScanData.isEmpty()) {
            Map<String, Object> empty = new HashMap<>();
            empty.put("timestamp", 0);
            empty.put("found", false);
            return ResponseEntity.ok(empty);
        }
        return ResponseEntity.ok(latestScanData);
    }

    /**
     * Endpoint for mobile scanner to update scan data
     * Called when a book barcode is scanned on mobile device
     */
    @PostMapping("/update-latest-scan")
    public ResponseEntity<?> updateLatestScan(@RequestBody Map<String, Object> scanData) {
        try {
            lastScanTimestamp = System.currentTimeMillis();
            scanData.put("timestamp", lastScanTimestamp);
            
            // Store the scan data
            latestScanData.clear();
            latestScanData.putAll(scanData);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Scan data updated");
            response.put("timestamp", lastScanTimestamp);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Endpoint to handle barcode scan from mobile device
     * Looks up book information and returns details
     */
    @PostMapping("/scan")
    public ResponseEntity<?> handleScan(@RequestBody Map<String, String> scanRequest) {
        String code = scanRequest.get("code");
        String type = scanRequest.get("type");
        
        Map<String, Object> response = new HashMap<>();
        
        if (code == null || code.isEmpty()) {
            response.put("found", false);
            response.put("message", "No barcode provided");
            return ResponseEntity.ok(response);
        }
        
        // Look up book in database
        Optional<Book> bookOpt = bookRepository.findByBarcodeId(code);
        
        if (bookOpt.isPresent()) {
            Book book = bookOpt.get();
            response.put("found", true);
            
            Map<String, Object> bookInfo = new HashMap<>();
            bookInfo.put("book_id", book.getBookId());
            bookInfo.put("barcode_id", book.getBarcodeId());
            bookInfo.put("title", book.getTitle());
            bookInfo.put("author", book.getAuthor());
            bookInfo.put("publisher", book.getPublisher());
            bookInfo.put("available_copies", book.getAvailableCopies());
            bookInfo.put("total_copies", book.getTotalCopies());
            bookInfo.put("is_available", book.getAvailableCopies() > 0);
            response.put("book_info", bookInfo);
            
            // Check if book is currently issued (to determine action)
            Optional<LibraryTransaction> activeTransaction = 
                transactionRepository.findByBookIdAndStatus(book.getBookId(), LibraryTransaction.Status.ISSUED);
            
            response.put("action", activeTransaction.isPresent() ? "return" : "issue");
            
            // Update latest scan for PC dashboard
            lastScanTimestamp = System.currentTimeMillis();
            response.put("timestamp", lastScanTimestamp);
            latestScanData.clear();
            latestScanData.putAll(response);
        } else {
            response.put("found", false);
            response.put("message", "Book not found in system");
        }
        
        return ResponseEntity.ok(response);
    }

    /**
     * Issue a book to a user
     */
    @PostMapping("/issue")
    public ResponseEntity<?> issueBook(@RequestBody Map<String, Object> request) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Handle both Integer and Long types for userId
            Long userId;
            Object userIdObj = request.get("userId");
            if (userIdObj instanceof Integer) {
                userId = ((Integer) userIdObj).longValue();
            } else if (userIdObj instanceof Long) {
                userId = (Long) userIdObj;
            } else if (userIdObj instanceof String) {
                userId = Long.parseLong((String) userIdObj);
            } else {
                response.put("success", false);
                response.put("error", "Invalid userId format");
                return ResponseEntity.badRequest().body(response);
            }
            
            String barcodeId = (String) request.get("barcodeId");
            
            if (userId == null || barcodeId == null) {
                response.put("success", false);
                response.put("error", "Missing userId or barcodeId");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Find the book by barcode
            Optional<Book> bookOpt = bookRepository.findByBarcodeId(barcodeId);
            if (!bookOpt.isPresent()) {
                response.put("success", false);
                response.put("error", "Book not found: " + barcodeId);
                return ResponseEntity.badRequest().body(response);
            }
            
            Book book = bookOpt.get();
            
            // Check if book is available
            if (book.getAvailableCopies() <= 0) {
                response.put("success", false);
                response.put("error", "No copies available for this book");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Create transaction
            LibraryTransaction transaction = new LibraryTransaction();
            transaction.setUserId(userId);
            transaction.setBookId(book.getBookId());
            transaction.setIssueDate(LocalDateTime.now());
            transaction.setDueDate(LocalDateTime.now().plusDays(14)); // 2 weeks due date
            transaction.setStatus(LibraryTransaction.Status.ISSUED);
            
            transactionRepository.save(transaction);
            
            // Decrease available copies
            book.setAvailableCopies(book.getAvailableCopies() - 1);
            book.setUpdatedAt(LocalDateTime.now());
            bookRepository.save(book);
            
            response.put("success", true);
            response.put("message", "Book '" + book.getTitle() + "' issued successfully");
            response.put("transaction_id", transaction.getTransactionId());
            response.put("due_date", transaction.getDueDate().toString());
            
            // Clear scan data after successful issue
            latestScanData.clear();
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * Return a book
     */
    @PostMapping("/return")
    public ResponseEntity<?> returnBook(@RequestBody Map<String, Object> request) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            String barcodeId = (String) request.get("barcodeId");
            
            if (barcodeId == null) {
                response.put("success", false);
                response.put("error", "Missing barcodeId");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Find the book
            Optional<Book> bookOpt = bookRepository.findByBarcodeId(barcodeId);
            if (!bookOpt.isPresent()) {
                response.put("success", false);
                response.put("error", "Book not found: " + barcodeId);
                return ResponseEntity.badRequest().body(response);
            }
            
            Book book = bookOpt.get();
            
            // Find active transaction for this book
            Optional<LibraryTransaction> transactionOpt = 
                transactionRepository.findByBookIdAndStatus(book.getBookId(), LibraryTransaction.Status.ISSUED);
            
            if (!transactionOpt.isPresent()) {
                response.put("success", false);
                response.put("error", "No active issue found for this book");
                return ResponseEntity.badRequest().body(response);
            }
            
            LibraryTransaction transaction = transactionOpt.get();
            
            // Update transaction
            transaction.setReturnDate(LocalDateTime.now());
            transaction.setStatus(LibraryTransaction.Status.RETURNED);
            
            // Calculate fine if overdue
            if (LocalDateTime.now().isAfter(transaction.getDueDate())) {
                long daysOverdue = java.time.Duration.between(transaction.getDueDate(), LocalDateTime.now()).toDays();
                transaction.setFineAmount(java.math.BigDecimal.valueOf(daysOverdue * 5)); // Rs. 5 per day
                response.put("fine_amount", transaction.getFineAmount());
                response.put("days_overdue", daysOverdue);
            }
            
            transactionRepository.save(transaction);
            
            // Increase available copies
            book.setAvailableCopies(book.getAvailableCopies() + 1);
            book.setUpdatedAt(LocalDateTime.now());
            bookRepository.save(book);
            
            response.put("success", true);
            response.put("message", "Book '" + book.getTitle() + "' returned successfully");
            response.put("transaction_id", transaction.getTransactionId());
            
            // Clear scan data after successful return
            latestScanData.clear();
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * Get user's borrowed books
     */
    @GetMapping("/user/{userId}/books")
    public ResponseEntity<?> getUserBooks(@PathVariable Long userId) {
        List<LibraryTransaction> transactions = 
            transactionRepository.findByUserIdAndStatus(userId, LibraryTransaction.Status.ISSUED);
        return ResponseEntity.ok(transactions);
    }

    /**
     * Clear the latest scan data
     */
    @PostMapping("/clear-scan")
    public ResponseEntity<?> clearScan() {
        latestScanData.clear();
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Scan data cleared");
        return ResponseEntity.ok(response);
    }
}
