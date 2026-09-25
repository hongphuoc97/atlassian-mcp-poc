package com.poc.copilot.service;

import com.poc.copilot.dto.CustomerRequest;
import com.poc.copilot.dto.CustomerResponse;
import com.poc.copilot.exception.CustomerNotFoundException;
import com.poc.copilot.model.Customer;
import com.poc.copilot.repository.CustomerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Business logic for customer operations.
 *
 * <p>Standards applied:
 * <ul>
 *   <li>STD-JAVA-001-R03: Constructor injection only.</li>
 *   <li>STD-LOG-001: No PII (email, full name) in log output.</li>
 *   <li>STD-API-001: Business logic belongs here, not in the controller.</li>
 * </ul>
 */
@Service
@Transactional(readOnly = true)
public class CustomerService {

    private static final Logger log = LoggerFactory.getLogger(CustomerService.class);

    private final CustomerRepository customerRepository;

    /** STD-JAVA-001-R03: Constructor injection. */
    public CustomerService(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    // ─── Queries ──────────────────────────────────────────────────────────────

    public CustomerResponse getById(Long id) {
        log.debug("Fetching customer id={}", id);
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new CustomerNotFoundException(id));
        return CustomerResponse.from(customer);
    }

    public Page<CustomerResponse> search(String name, Pageable pageable) {
        log.debug("Searching customers by name fragment (length={})", name == null ? 0 : name.length());
        if (name == null || name.isBlank()) {
            return customerRepository.findAll(pageable).map(CustomerResponse::from);
        }
        return customerRepository.searchByName(name, pageable).map(CustomerResponse::from);
    }

    // ─── Commands ─────────────────────────────────────────────────────────────

    @Transactional
    public CustomerResponse create(CustomerRequest request) {
        log.info("Creating customer (name length={})", request.name().length());
        Customer customer = new Customer(request.name(), request.email(), request.address());
        return CustomerResponse.from(customerRepository.save(customer));
    }

    /**
     * Updates the mutable fields of a customer.
     *
     * <p><b>POC-3, AC-2:</b> Ownership verification must be performed by the caller
     * (controller/security layer) before invoking this method.
     */
    @Transactional
    public CustomerResponse update(Long id, CustomerRequest request) {
        log.info("Updating customer id={}", id);
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new CustomerNotFoundException(id));
        customer.setName(request.name());
        customer.setAddress(request.address());
        return CustomerResponse.from(customerRepository.save(customer));
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting customer id={}", id);
        if (!customerRepository.existsById(id)) {
            throw new CustomerNotFoundException(id);
        }
        customerRepository.deleteById(id);
    }
}
