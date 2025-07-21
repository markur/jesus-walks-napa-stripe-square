
import { QueryClient } from '@tanstack/react-query';

// Create and export the query client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

// API helper function
export async function apiRequest(endpoint: string, options?: RequestInit) {
  console.log(`Making API request to: ${endpoint}`);
  
  const baseUrl = '';
  const url = `${baseUrl}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options?.headers,
    },
  };

  console.log(`Full request URL: ${url}`);
  console.log('Request options:', mergedOptions);

  const response = await fetch(url, mergedOptions);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API request failed: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  console.log('API response data:', data);
  return data;
}
