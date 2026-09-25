package com.poc.copilot.repository;

import com.poc.copilot.model.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

/**
 * Spring Data JPA repository for {@link Customer}.
 *
 * <p><b>STD-SEC-001-R02:</b> All queries use parameterized binding via JPQL / Spring Data.
 * Raw string concatenation is prohibited.
 */
public interface CustomerRepository extends JpaRepository<Customer, Long> {

    Optional<Customer> findByEmail(String email);

    /**
     * Search customers by name (case-insensitive, partial match).
     * Uses JPQL with named parameter — no string concatenation.
     */
    @Query("SELECT c FROM Customer c WHERE LOWER(c.name) LIKE LOWER(CONCAT('%', :name, '%'))")
    Page<Customer> searchByName(@Param("name") String name, Pageable pageable);
}
