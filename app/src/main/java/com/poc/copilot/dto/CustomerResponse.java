package com.poc.copilot.dto;

import com.poc.copilot.model.Customer;

/**
 * Response DTO for customer data.
 * Note: email is included for identification; PII fields must never appear in logs.
 */
public record CustomerResponse(
        Long id,
        String name,
        String address
) {
    /** Factory method — deliberately omits email from public response. */
    public static CustomerResponse from(Customer customer) {
        return new CustomerResponse(
                customer.getId(),
                customer.getName(),
                customer.getAddress()
        );
    }
}
