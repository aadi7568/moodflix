/**
 * React hook for making authenticated API requests
 * Automatically handles anonymous session tokens
 */

import { useCallback } from 'react';
import { getAuthHeaders, handleSessionTokenFromResponse } from './client-auth';

interface ApiRequestOptions extends RequestInit {
  skipAuth?: boolean;
}

/**
 * Custom hook for making API requests with automatic session token handling
 */
export function useApiClient() {
  const apiRequest = useCallback(async (
    url: string,
    options: ApiRequestOptions = {}
  ): Promise<Response> => {
    const { skipAuth = false, ...fetchOptions } = options;

    // Add auth headers unless skipped
    const headers = skipAuth
      ? { 'Content-Type': 'application/json' }
      : getAuthHeaders();

    // Merge with any existing headers
    const finalHeaders = {
      ...headers,
      ...fetchOptions.headers,
    };

    const response = await fetch(url, {
      ...fetchOptions,
      headers: finalHeaders,
      credentials: 'include', // Include cookies
    });

    // Handle session token from response
    handleSessionTokenFromResponse(response);

    return response;
  }, []);

  return { apiRequest };
}

/**
 * Standalone function for making API requests (for use outside React components)
 */
export async function apiRequest(
  url: string,
  options: ApiRequestOptions = {}
): Promise<Response> {
  const { skipAuth = false, ...fetchOptions } = options;

  // Add auth headers unless skipped
  const headers = skipAuth
    ? { 'Content-Type': 'application/json' }
    : getAuthHeaders();

  // Merge with any existing headers
  const finalHeaders = {
    ...headers,
    ...fetchOptions.headers,
  };

  const response = await fetch(url, {
    ...fetchOptions,
    headers: finalHeaders,
    credentials: 'include', // Include cookies
  });

  // Handle session token from response
  handleSessionTokenFromResponse(response);

  return response;
}

