/**
 * Property-based tests for form validation utilities
 * **Feature: login-page**
 */

import * as fc from 'fast-check';
import {
  validateEmail,
  validatePassword,
  validateRequired,
} from '../../lib/validation';

/**
 * **Feature: login-page, Property 1: Email Validation Rejects Invalid Formats**
 * **Validates: Requirements 1.3**
 *
 * For any string that does not match the standard email format
 * (containing @ and valid domain), the email validation function
 * SHALL return false and produce an appropriate error message.
 */
describe('Property 1: Email Validation Rejects Invalid Formats', () => {
  // Arbitrary for strings without @ symbol
  const stringWithoutAt = fc.string().filter((s) => !s.includes('@'));

  // Arbitrary for strings with @ but no domain (nothing after @)
  const stringWithAtNoDomain = fc
    .tuple(fc.string({ minLength: 1 }), fc.constant('@'))
    .map(([local, at]) => local + at);

  // Arbitrary for strings with @ but no dot in domain
  const stringWithAtNoDot = fc
    .tuple(
      fc.string({ minLength: 1 }).filter((s) => !s.includes('@') && !s.includes(' ')),
      fc.constant('@'),
      fc.string({ minLength: 1 }).filter((s) => !s.includes('.') && !s.includes('@') && !s.includes(' '))
    )
    .map(([local, at, domain]) => local + at + domain);

  it('should reject strings without @ symbol', async () => {
    await fc.assert(
      fc.property(stringWithoutAt, (email) => {
        const result = validateEmail(email);
        // Empty strings are rejected with "required" error
        // Non-empty strings without @ are rejected with "invalid" error
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });

  it('should reject strings with @ but no content after', async () => {
    await fc.assert(
      fc.property(stringWithAtNoDomain, (email) => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });


  it('should reject strings with @ but no dot in domain', async () => {
    await fc.assert(
      fc.property(stringWithAtNoDot, (email) => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Please enter a valid email address');
      }),
      { numRuns: 100 }
    );
  });

  it('should accept valid email formats', async () => {
    await fc.assert(
      fc.property(fc.emailAddress(), (email) => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: login-page, Property 2: Password Length Validation**
 * **Validates: Requirements 1.4**
 *
 * For any string with length less than 8 characters, the password
 * validation function SHALL return false and produce an error message
 * indicating minimum length requirement.
 */
describe('Property 2: Password Length Validation', () => {
  // Arbitrary for non-empty strings shorter than 8 characters
  const shortPassword = fc.string({ minLength: 1, maxLength: 7 });

  // Arbitrary for strings with 8 or more characters
  const validLengthPassword = fc.string({ minLength: 8, maxLength: 100 });

  it('should reject passwords shorter than 8 characters', async () => {
    await fc.assert(
      fc.property(shortPassword, (password) => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Password must be at least 8 characters');
      }),
      { numRuns: 100 }
    );
  });

  it('should accept passwords with 8 or more characters', async () => {
    await fc.assert(
      fc.property(validLengthPassword, (password) => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: login-page, Property 3: Empty Field Validation**
 * **Validates: Requirements 2.5**
 *
 * For any empty string or whitespace-only string provided as email
 * or password, the form validation SHALL prevent submission and
 * return appropriate field-specific errors.
 */
describe('Property 3: Empty Field Validation', () => {
  // Arbitrary for whitespace-only strings
  const whitespaceOnly = fc
    .array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 0, maxLength: 20 })
    .map((chars) => chars.join(''));

  it('should reject empty or whitespace-only emails', async () => {
    await fc.assert(
      fc.property(whitespaceOnly, (email) => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Email is required');
      }),
      { numRuns: 100 }
    );
  });

  it('should reject empty passwords', async () => {
    const result = validatePassword('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Password is required');
  });

  it('should reject whitespace-only values in required fields', async () => {
    await fc.assert(
      fc.property(whitespaceOnly, fc.string({ minLength: 1 }), (value, fieldName) => {
        const result = validateRequired(value, fieldName);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe(`${fieldName} is required`);
      }),
      { numRuns: 100 }
    );
  });
});
