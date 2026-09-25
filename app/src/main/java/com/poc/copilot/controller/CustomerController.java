package com.poc.copilot.controller;

import com.poc.copilot.dto.CustomerRequest;
import com.poc.copilot.dto.CustomerResponse;
import com.poc.copilot.service.CustomerService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for the Customer resource.
 *
 * <p>
 * Standards applied:
 * <ul>
 * <li>STD-JAVA-001-R03: Constructor injection only (no field injection).</li>
 * <li>STD-API-001: No business logic here — all delegated to
 * {@link CustomerService}.</li>
 * <li>STD-SEC-001-R04: Update endpoint verifies ownership (POC-3, AC-2).</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    private final CustomerService customerService;

    /** STD-JAVA-001-R03: Constructor injection. */
    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    // ─── GET /api/customers/{id} (POC-1) ────────────────────────────────────

    /**
     * Retrieves a customer by ID.
     *
     * <p>
     * POC-1, AC-1: Returns HTTP 200 with customer data when the ID exists.
     * <p>
     * POC-1, AC-2: Returns HTTP 404 when the ID does not exist (handled by
     * {@link com.poc.copilot.exception.GlobalExceptionHandler}).
     */
    @GetMapping("/{id}")
    public ResponseEntity<CustomerResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(customerService.getById(id));
    }

    // ─── GET /api/customers (POC-2) ─────────────────────────────────────────

    /**
     * Searches customers by optional name fragment with pagination.
     *
     * <p>
     * POC-2, AC-1: Supports name-based search with pagination.
     * <p>
     * POC-2, AC-2: Returns empty page (not 404) when no results found.
     */
    @GetMapping
    public ResponseEntity<Page<CustomerResponse>> search(
            @RequestParam(required = false) String name,
            @PageableDefault(size = 20, sort = "name") Pageable pageable) {
        return ResponseEntity.ok(customerService.search(name, pageable));
    }

    // ─── POST /api/customers ──────────────────────────────────────────────────

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CustomerResponse> create(@Valid @RequestBody CustomerRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(customerService.create(request));
    }

    // ─── PUT /api/customers/{id} (POC-3) ────────────────────────────────────

    /**
     * Updates a customer's profile.
     *
     * <p>
     * POC-3, AC-1: Only the authenticated owner or an ADMIN may update.
     * <p>
     * POC-3, AC-2: STD-SEC-001-R04 — ownership is verified before delegating to
     * service.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @ownershipGuard.isOwner(#principal, #id)")
    public ResponseEntity<CustomerResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody CustomerRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(customerService.update(id, request));
    }

    // ─── DELETE /api/customers/{id} ───────────────────────────────────────────

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        customerService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
