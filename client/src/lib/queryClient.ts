import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 2,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

export async function apiRequest(url: string, options: RequestInit = {}) {
  const baseUrl = window.location.origin;
  const fullUrl = `${baseUrl}${url}`;

  console.log(`API Request: ${options.method || 'GET'} ${fullUrl}`);

  const response = await fetch(fullUrl, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API Error: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  console.log(`API Response:`, data);
  return data;
}