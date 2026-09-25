package com.poc.copilot.security;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

/**
 * Authorization guard that verifies whether the authenticated user owns the
 * requested customer record.
 *
 * <p><b>POC-3, AC-2 / STD-SEC-001-R04:</b> Ownership check for update operations.
 *
 * <p>In this POC the mapping is username == customer-id (string). In a real system
 * this would query a user ↔ customer mapping table.
 */
@Component("ownershipGuard")
public class OwnershipGuard {

    /**
     * Returns {@code true} if the authenticated user owns the customer with the given ID.
     *
     * @param principal the authenticated user
     * @param customerId the customer ID from the path variable
     */
    public boolean isOwner(UserDetails principal, Long customerId) {
        if (principal == null || customerId == null) {
            return false;
        }
        // POC simplification: username is "user-{id}"
        return principal.getUsername().equals("user-" + customerId);
    }
}
