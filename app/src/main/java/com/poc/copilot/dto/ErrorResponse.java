package com.poc.copilot.dto;

import java.time.Instant;
import java.util.List;

/**
 * Standard error response envelope (ADR-001).
 *
 * <pre>
 * {
 *   "status": 404,
 *   "error": "Not Found",
 *   "message": "Customer not found: 99",
 *   "path": "/api/customers/99",
 *   "timestamp": "2026-09-10T10:00:00Z"
 * }
 * </pre>
 */
public record ErrorResponse(
        int status,
        String error,
        String message,
        String path,
        Instant timestamp,
        List<FieldError> fieldErrors
) {
    public record FieldError(String field, String message) {}

    public static ErrorResponse of(int status, String error, String message, String path) {
        return new ErrorResponse(status, error, message, path, Instant.now(), List.of());
    }

    public static ErrorResponse withFieldErrors(int status, String error, String message,
                                                String path, List<FieldError> fieldErrors) {
        return new ErrorResponse(status, error, message, path, Instant.now(), fieldErrors);
    }
}
