package com.poc.copilot.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for creating or updating a customer.
 * Email is intentionally not updatable (immutable business key).
 */
public record CustomerRequest(

        @NotBlank(message = "Name must not be blank")
        @Size(max = 100, message = "Name must be at most 100 characters")
        String name,

        @NotBlank(message = "Email must not be blank")
        @Size(max = 150, message = "Email must be at most 150 characters")
        String email,

        @Size(max = 200, message = "Address must be at most 200 characters")
        String address
) {}
