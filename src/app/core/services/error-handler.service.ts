import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

/**
 * Centralized error handling service.
 * Provides consistent error messages and logging across the application.
 */
@Injectable({
    providedIn: 'root'
})
export class ErrorHandlerService {
    /**
     * Handles HTTP errors and displays user-friendly messages
     * @param error - The error object (HttpErrorResponse or any)
     * @param context - Optional context for logging (e.g., 'Loading users')
     * @param customMessage - Optional custom message to show to user
     */
    handleError(error: any, context?: string, customMessage?: string): void {
        const errorMessage = this.extractErrorMessage(error);

        // Log to console with context
        if (context) {
            console.error(`❌ Error in ${context}:`, error);
        } else {
            console.error('❌ Error:', error);
        }

        // Show user-friendly message
        this.showErrorDialog(customMessage || errorMessage);
    }

    /**
     * Handles HTTP errors specifically
     * @param error - HttpErrorResponse object
     * @param context - Context for the operation
     */
    handleHttpError(error: HttpErrorResponse, context?: string): void {
        let errorMessage: string;

        if (error.error instanceof ErrorEvent) {
            // Client-side or network error
            errorMessage = 'Network error occurred. Please check your connection.';
        } else {
            // Server-side error
            switch (error.status) {
                case 400:
                    errorMessage = 'Invalid request. Please check your input.';
                    break;
                case 401:
                    errorMessage = 'Unauthorized. Please login again.';
                    break;
                case 403:
                    // Check for role-based permission errors
                    if (error.error?.message && error.error.message.includes('Required roles:')) {
                        errorMessage = 'You do not have the required permissions to access this resource. Please contact your system administrator if you believe this is incorrect.';
                    } else {
                        errorMessage = 'Access denied. You do not have permission.';
                    }
                    break;
                case 404:
                    errorMessage = 'Resource not found.';
                    break;
                case 409:
                    errorMessage = 'Conflict. The resource already exists or has been modified.';
                    break;
                case 422:
                    errorMessage = 'Validation error. Please check your input.';
                    break;
                case 500:
                    errorMessage = 'Server error. Please try again later.';
                    break;
                case 503:
                    errorMessage = 'Service unavailable. Please try again later.';
                    break;
                default:
                    errorMessage = error.error?.message || 'An unexpected error occurred.';
            }
        }

        this.handleError(error, context, errorMessage);
    }

    /**
     * Shows a success toast/dialog
     * @param message - Success message
     * @param title - Optional title (default: 'Success')
     */
    showSuccess(message: string, title: string = 'Success'): void {
        Swal.fire({
            icon: 'success',
            title: title,
            text: message,
            confirmButtonColor: '#10B981',
            timer: 3000,
            showConfirmButton: false
        });
    }

    /**
     * Shows a warning dialog
     * @param message - Warning message
     * @param title - Optional title (default: 'Warning')
     */
    showWarning(message: string, title: string = 'Warning'): void {
        Swal.fire({
            icon: 'warning',
            title: title,
            text: message,
            confirmButtonColor: '#F59E0B'
        });
    }

    /**
     * Shows a confirmation dialog
     * @param message - Confirmation message
     * @param title - Optional title (default: 'Confirm')
     * @returns Promise that resolves to true if confirmed, false otherwise
     */
    async confirmAction(message: string, title: string = 'Confirm'): Promise<boolean> {
        const result = await Swal.fire({
            icon: 'question',
            title: title,
            text: message,
            showCancelButton: true,
            confirmButtonText: 'Yes',
            cancelButtonText: 'No',
            confirmButtonColor: '#3B82F6',
            cancelButtonColor: '#6B7280'
        });

        return result.isConfirmed;
    }

    /**
     * Extracts error message from various error types
     */
    private extractErrorMessage(error: any): string {
        if (typeof error === 'string') {
            return error;
        }

        if (error instanceof HttpErrorResponse) {
            return error.error?.message || error.message || 'An unexpected error occurred.';
        }

        if (error?.error?.message) {
            return error.error.message;
        }

        if (error?.message) {
            return error.message;
        }

        return 'An unexpected error occurred.';
    }

    /**
     * Handles errors silently without showing a dialog
     * Useful for non-critical operations like loading reference data
     * @param error - The error object
     * @param context - Optional context for logging
     */
    handleErrorSilent(error: any, context?: string): void {
        if (context) {
            console.warn(`⚠️ ${context}:`, error?.error?.message || error?.message || error);
        } else {
            console.warn('⚠️ Error:', error?.error?.message || error?.message || error);
        }
    }

    /**
     * Shows error dialog with SweetAlert2
     */
    private showErrorDialog(message: string): void {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: message,
            confirmButtonColor: '#EF4444'
        });
    }
}
