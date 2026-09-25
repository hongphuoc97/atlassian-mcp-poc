package com.poc.copilot.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Entity
@Table(name = "customers")
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(max = 100)
    @Column(nullable = false, length = 100)
    private String name;

    @NotBlank
    @Size(max = 150)
    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(length = 200)
    private String address;

    // ─── Constructors ────────────────────────────────────────────────────────

    protected Customer() {
        // JPA required
    }

    public Customer(String name, String email, String address) {
        this.name = name;
        this.email = email;
        this.address = address;
    }

    // ─── Getters ─────────────────────────────────────────────────────────────

    public Long getId() { return id; }

    public String getName() { return name; }

    public String getEmail() { return email; }

    public String getAddress() { return address; }

    // ─── Setters (used by service layer only) ────────────────────────────────

    public void setName(String name) { this.name = name; }

    public void setAddress(String address) { this.address = address; }
}
