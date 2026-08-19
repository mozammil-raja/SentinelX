package com.sentinelx.backend.exception;

/**
 * Custom runtime exception thrown when a requested resource (e.g., User, Transaction) is not found in the database.
 */
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
