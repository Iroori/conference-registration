package com.roo.payment.domain.user.repository;

import com.roo.payment.domain.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailAndActiveTrue(String email);

    boolean existsByEmail(String email);

    @Query("SELECT u FROM User u WHERE u.active = true AND (" +
           "LOWER(u.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.affiliation) LIKE LOWER(CONCAT('%', :search, '%'))" +
           ")")
    Page<User> searchActiveUsers(@Param("search") String search, Pageable pageable);

    Page<User> findByActiveTrue(Pageable pageable);
}
