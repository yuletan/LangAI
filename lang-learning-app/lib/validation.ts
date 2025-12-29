/**
 * Form validation utilities for authentication
 * Requirements: 1.3, 1.4, 2.5
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates email format using a standard regex pattern
 * Requirements: 1.3 - Invalid email format validation
 */
export const validateEmail = (email: string): ValidationResult => {
  // Check for empty or whitespace-only input
  if (!email || email.trim().length === 0) {
    return {
      isValid: false,
      error: 'Email is required',
    };
  }

  const trimmedEmail = email.trim();

  // Standard email regex pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmedEmail)) {
    return {
      isValid: false,
      error: 'Please enter a valid email address',
    };
  }

  return { isValid: true };
};

/**
 * Validates password meets minimum length requirement
 * Requirements: 1.4 - Password minimum 8 characters
 */
export const validatePassword = (password: string): ValidationResult => {
  // Check for empty or whitespace-only input
  if (!password || password.length === 0) {
    return {
      isValid: false,
      error: 'Password is required',
    };
  }

  if (password.length < 8) {
    return {
      isValid: false,
      error: 'Password must be at least 8 characters',
    };
  }

  return { isValid: true };
};

/**
 * Validates that a field is not empty or whitespace-only
 * Requirements: 2.5 - Empty field validation
 */
export const validateRequired = (
  value: string,
  fieldName: string
): ValidationResult => {
  if (!value || value.trim().length === 0) {
    return {
      isValid: false,
      error: `${fieldName} is required`,
    };
  }

  return { isValid: true };
};

/**
 * Validates login form fields
 */
export const validateLoginForm = (
  email: string,
  password: string
): { email?: string; password?: string; isValid: boolean } => {
  const emailResult = validateEmail(email);
  const passwordResult = validatePassword(password);

  return {
    email: emailResult.error,
    password: passwordResult.error,
    isValid: emailResult.isValid && passwordResult.isValid,
  };
};
