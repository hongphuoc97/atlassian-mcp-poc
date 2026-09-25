package com.poc.copilot.service;

import com.poc.copilot.dto.CustomerRequest;
import com.poc.copilot.dto.CustomerResponse;
import com.poc.copilot.exception.CustomerNotFoundException;
import com.poc.copilot.model.Customer;
import com.poc.copilot.repository.CustomerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CustomerServiceTest {

    @Mock  CustomerRepository customerRepository;
    @InjectMocks CustomerService customerService;

    private Customer alice;

    @BeforeEach
    void setUp() {
        alice = new Customer("Alice", "alice@example.com", "123 Main St");
        // simulate JPA-set ID via reflection
        try {
            var idField = Customer.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(alice, 1L);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    // ─── getById ──────────────────────────────────────────────────────────────

    @Test
    @DisplayName("getById: existing ID returns CustomerResponse")
    void getById_existing_returnsResponse() {
        when(customerRepository.findById(1L)).thenReturn(Optional.of(alice));
        CustomerResponse result = customerService.getById(1L);
        assertThat(result.id()).isEqualTo(1L);
        assertThat(result.name()).isEqualTo("Alice");
    }

    @Test
    @DisplayName("getById: missing ID throws CustomerNotFoundException")
    void getById_missing_throwsNotFound() {
        when(customerRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> customerService.getById(99L))
                .isInstanceOf(CustomerNotFoundException.class)
                .hasMessageContaining("99");
    }

    // ─── create ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("create: valid request persists and returns response")
    void create_validRequest_persistsAndReturns() {
        when(customerRepository.save(any(Customer.class))).thenReturn(alice);
        CustomerResponse result = customerService.create(
                new CustomerRequest("Alice", "alice@example.com", "123 Main St"));
        assertThat(result.name()).isEqualTo("Alice");
        verify(customerRepository).save(any(Customer.class));
    }

    // ─── update ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("update: existing customer updates mutable fields only")
    void update_existing_updatesMutableFields() {
        when(customerRepository.findById(1L)).thenReturn(Optional.of(alice));
        when(customerRepository.save(any())).thenReturn(alice);

        CustomerResponse result = customerService.update(1L,
                new CustomerRequest("Alice Updated", "alice@example.com", "New Address"));

        verify(customerRepository).save(alice);
        assertThat(result).isNotNull();
    }

    @Test
    @DisplayName("update: missing customer throws CustomerNotFoundException")
    void update_missing_throwsNotFound() {
        when(customerRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> customerService.update(99L,
                new CustomerRequest("X", "x@example.com", null)))
                .isInstanceOf(CustomerNotFoundException.class);
    }

    // ─── delete ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("delete: missing customer throws CustomerNotFoundException")
    void delete_missing_throwsNotFound() {
        when(customerRepository.existsById(99L)).thenReturn(false);
        assertThatThrownBy(() -> customerService.delete(99L))
                .isInstanceOf(CustomerNotFoundException.class);
        verify(customerRepository, never()).deleteById(any());
    }
}
