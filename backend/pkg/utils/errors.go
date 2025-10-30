package utils

import (
	"fmt"
	"net/http"
    "errors" // 🆕 Required for defining the sentinel error
)

// ErrorType defines the type of error that occurred, which can be mapped to an HTTP status code.
type ErrorType string

const (
    // ... (Your existing error types)
	
	ErrInternal     ErrorType = "Internal"
	ErrInvalidInput ErrorType = "InvalidInput"
	ErrUnauthorized ErrorType = "Unauthorized"
	ErrNotFound     ErrorType = "NotFound"
    
    // 🆕 New Error Type for the business logic condition
    ErrConflict     ErrorType = "Conflict" // Best fit for an already existing resource
)

// 🆕 SENTINEL ERROR VARIABLE: This is the specific error the handlers will check against.
// This is the variable that resolves the 'undefined' error in the handler.
var ErrOrderAlreadyProcessed = errors.New("order already processed successfully")

// AppError is a custom error struct used across the application.
type AppError struct {
	Type    ErrorType
	Message string
    
    // 🆕 Field to hold the original error, if wrapping
    BaseError error 
}

// NewError creates a new AppError.
func NewError(errorType ErrorType, message string, baseErr ...error) *AppError {
    var base error
    if len(baseErr) > 0 {
        base = baseErr[0]
    }
	return &AppError{
		Type:    errorType,
		Message: message,
        BaseError: base, // Store the wrapped error
	}
}

// Error implements the error interface.
func (e *AppError) Error() string {
	return fmt.Sprintf("[%s] %s", e.Type, e.Message)
}

// Unwrap allows 'errors.Is' and 'errors.As' to inspect the wrapped error.
func (e *AppError) Unwrap() error {
    return e.BaseError
}

// HTTPStatus returns the appropriate HTTP status code for the error type.
func (e *AppError) HTTPStatus() int {
	switch e.Type {
	case ErrInvalidInput:
		return http.StatusBadRequest
	case ErrNotFound:
		return http.StatusNotFound
	case ErrUnauthorized:
		return http.StatusUnauthorized
    // 🆕 Map the new Conflict type to 409
    case ErrConflict:
        return http.StatusConflict // HTTP 409 is perfect for resource already existing
	case ErrInternal:
		return http.StatusInternalServerError
	default:
		return http.StatusInternalServerError
	}
}