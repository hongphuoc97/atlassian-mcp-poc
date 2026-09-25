package com.poc.copilot.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.poc.copilot.dto.CustomerRequest;
import com.poc.copilot.dto.CustomerResponse;
import com.poc.copilot.exception.CustomerNotFoundException;
import com.poc.copilot.service.CustomerService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * POC-1 / POC-2 / POC-3 controller integration tests.
 *
 * <p>Covers: happy path, not-found (404), validation errors (400),
 * and authorization failures (403).
 */
@SpringBootTest
@AutoConfigureMockMvc
class CustomerControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockBean  CustomerService customerService;

    private static final CustomerResponse ALICE =
            new CustomerResponse(1L, "Alice", "123 Main St");

    // ─── GET /api/customers/{id} ──────────────────────────────────────────────

    @Test
    @DisplayName("POC-1 AC-1: GET existing customer returns 200 with data")
    void getById_existingCustomer_returns200() throws Exception {
        when(customerService.getById(1L)).thenReturn(ALICE);

        mockMvc.perform(get("/api/customers/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("Alice"));
    }

    @Test
    @DisplayName("POC-1 AC-2: GET non-existent customer returns 404 with standard error envelope")
    void getById_missingCustomer_returns404() throws Exception {
        when(customerService.getById(99L)).thenThrow(new CustomerNotFoundException(99L));

        mockMvc.perform(get("/api/customers/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.path").value("/api/customers/99"));
    }

    // ─── GET /api/customers ───────────────────────────────────────────────────

    @Test
    @DisplayName("POC-2 AC-1: Search returns paginated results")
    void search_byName_returnsPaginatedResults() throws Exception {
        when(customerService.search(eq("Alice"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(ALICE)));

        mockMvc.perform(get("/api/customers").param("name", "Alice"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("Alice"));
    }

    @Test
    @DisplayName("POC-2 AC-2: Search with no results returns empty page, not 404")
    void search_noResults_returnsEmptyPage() throws Exception {
        when(customerService.search(eq("Unknown"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        mockMvc.perform(get("/api/customers").param("name", "Unknown"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isEmpty());
    }

    // ─── POST /api/customers ──────────────────────────────────────────────────

    @Test
    @DisplayName("POST with invalid body returns 400 with field errors")
    @WithMockUser(roles = "ADMIN")
    void create_invalidBody_returns400() throws Exception {
        String body = objectMapper.writeValueAsString(
                new CustomerRequest("", "", null));

        mockMvc.perform(post("/api/customers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.fieldErrors").isArray());
    }

    @Test
    @DisplayName("POST without authentication returns 401")
    void create_unauthenticated_returns401() throws Exception {
        String body = objectMapper.writeValueAsString(
                new CustomerRequest("Bob", "bob@example.com", null));

        mockMvc.perform(post("/api/customers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());
    }

    // ─── PUT /api/customers/{id}  (POC-3) ────────────────────────────────────

    @Test
    @DisplayName("POC-3 AC-1: ADMIN can update any customer")
    @WithMockUser(roles = "ADMIN")
    void update_asAdmin_returns200() throws Exception {
        when(customerService.update(eq(1L), any())).thenReturn(ALICE);
        String body = objectMapper.writeValueAsString(
                new CustomerRequest("Alice Updated", "alice@example.com", "New Addr"));

        mockMvc.perform(put("/api/customers/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POC-3 AC-2: Non-owner USER cannot update another customer's profile")
    @WithMockUser(username = "user-2", roles = "USER")
    void update_asNonOwner_returns403() throws Exception {
        String body = objectMapper.writeValueAsString(
                new CustomerRequest("Hacker", "hacker@evil.com", null));

        // user-2 trying to update customer 1 — should be denied
        mockMvc.perform(put("/api/customers/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden());
    }
}
