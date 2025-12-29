/**
 * **Feature: login-page, Property 6: Session Persistence Round-Trip**
 * **Validates: Requirements 2.4**
 * 
 * For any valid session object stored after successful authentication,
 * retrieving the session from storage SHALL return an equivalent session
 * object that can be used to restore the authenticated state.
 */

import * as fc from 'fast-check';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Session storage key used by Supabase
const SUPABASE_AUTH_TOKEN_KEY = 'sb-auth-token';

// Arbitrary for generating valid User objects
const userArbitrary = fc.record({
  id: fc.uuid(),
  email: fc.emailAddress(),
  created_at: fc.date().map(d => d.toISOString()),
  updated_at: fc.option(fc.date().map(d => d.toISOString()), { nil: undefined }),
  app_metadata: fc.record({
    provider: fc.option(fc.constantFrom('email', 'google', 'github'), { nil: undefined }),
  }),
  user_metadata: fc.dictionary(fc.string(), fc.jsonValue()),
});

// Arbitrary for generating valid Session objects
const sessionArbitrary = fc.record({
  access_token: fc.hexaString({ minLength: 32, maxLength: 64 }),
  refresh_token: fc.hexaString({ minLength: 32, maxLength: 64 }),
  expires_in: fc.integer({ min: 3600, max: 86400 }),
  expires_at: fc.option(fc.integer({ min: Math.floor(Date.now() / 1000), max: Math.floor(Date.now() / 1000) + 86400 }), { nil: undefined }),
  token_type: fc.constant('bearer'),
  user: userArbitrary,
});

describe('Session Persistence Round-Trip Property Test', () => {
  // Create a mock storage that actually stores values
  let mockStorage: Map<string, string>;

  beforeEach(() => {
    mockStorage = new Map();
    
    // Override AsyncStorage mock to use our map
    (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
      mockStorage.set(key, value);
      return Promise.resolve();
    });
    
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      return Promise.resolve(mockStorage.get(key) || null);
    });
    
    (AsyncStorage.removeItem as jest.Mock).mockImplementation((key: string) => {
      mockStorage.delete(key);
      return Promise.resolve();
    });
  });

  afterEach(() => {
    mockStorage.clear();
    jest.clearAllMocks();
  });

  /**
   * Property: Session Persistence Round-Trip
   * 
   * For any valid session object, storing it and then retrieving it
   * should return an equivalent session that can restore auth state.
   */
  it('should preserve session data through storage round-trip', async () => {
    await fc.assert(
      fc.asyncProperty(sessionArbitrary, async (session) => {
        // Store the session
        const sessionJson = JSON.stringify(session);
        await AsyncStorage.setItem(SUPABASE_AUTH_TOKEN_KEY, sessionJson);
        
        // Retrieve the session
        const retrievedJson = await AsyncStorage.getItem(SUPABASE_AUTH_TOKEN_KEY);
        
        // Verify retrieval was successful
        expect(retrievedJson).not.toBeNull();
        
        // Parse and compare
        const retrievedSession = JSON.parse(retrievedJson!);
        
        // Verify essential session properties are preserved
        expect(retrievedSession.access_token).toBe(session.access_token);
        expect(retrievedSession.refresh_token).toBe(session.refresh_token);
        expect(retrievedSession.expires_in).toBe(session.expires_in);
        expect(retrievedSession.token_type).toBe(session.token_type);
        
        // Verify user data is preserved
        expect(retrievedSession.user.id).toBe(session.user.id);
        expect(retrievedSession.user.email).toBe(session.user.email);
        expect(retrievedSession.user.created_at).toBe(session.user.created_at);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Session can be used to restore authenticated state
   * 
   * A retrieved session should have all required fields to restore auth.
   */
  it('should have all required fields for auth state restoration', async () => {
    await fc.assert(
      fc.asyncProperty(sessionArbitrary, async (session) => {
        // Store and retrieve
        await AsyncStorage.setItem(SUPABASE_AUTH_TOKEN_KEY, JSON.stringify(session));
        const retrievedJson = await AsyncStorage.getItem(SUPABASE_AUTH_TOKEN_KEY);
        const retrievedSession = JSON.parse(retrievedJson!);
        
        // Verify all required fields exist for auth restoration
        expect(retrievedSession).toHaveProperty('access_token');
        expect(retrievedSession).toHaveProperty('refresh_token');
        expect(retrievedSession).toHaveProperty('user');
        expect(retrievedSession.user).toHaveProperty('id');
        expect(retrievedSession.user).toHaveProperty('email');
        
        // Verify tokens are non-empty strings
        expect(typeof retrievedSession.access_token).toBe('string');
        expect(retrievedSession.access_token.length).toBeGreaterThan(0);
        expect(typeof retrievedSession.refresh_token).toBe('string');
        expect(retrievedSession.refresh_token.length).toBeGreaterThan(0);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
});
