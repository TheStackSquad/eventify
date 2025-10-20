// pkg/utils/errors.go

package utils

import (
	"fmt"
	"net/http"
)

// ErrorType defines the type of error that occurred, which can be mapped to an HTTP status code.
type ErrorType string

const (
	ErrInternal     ErrorType = "Internal"
	ErrInvalidInput ErrorType = "InvalidInput"
	ErrUnauthorized ErrorType = "Unauthorized"
	ErrNotFound     ErrorType = "NotFound"
)

// AppError is a custom error struct used across the application.
type AppError struct {
	Type    ErrorType
	Message string
}

// NewError creates a new AppError.
func NewError(errorType ErrorType, message string) *AppError {
	return &AppError{
		Type:    errorType,
		Message: message,
	}
}

// Error implements the error interface.
func (e *AppError) Error() string {
	return fmt.Sprintf("[%s] %s", e.Type, e.Message)
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
	case ErrInternal:
		return http.StatusInternalServerError
	default:
		return http.StatusInternalServerError
	}
}