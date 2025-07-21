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
export async function apiRequest(
  method: "GET" | "POST" | "PUT" | "DELETE",
  url: string,
  data?: any
): Promise<Response> {
  console.log(`=== API REQUEST: ${method} ${url} ===`);

  if (data) {
    console.log('Request data:', JSON.stringify(data, null, 2));
    console.log('Data type:', typeof data);
    console.log('Data constructor:', data.constructor.name);
  }

  const config: RequestInit = {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (data) {
    config.body = JSON.stringify(data);
    console.log('Stringified body:', config.body);
  }

  console.log('Full request config:', {
    ...config,
    body: config.body ? 'JSON data present' : 'No body'
  });

  try {
    const response = await fetch(url, config);
    console.log(`Response status: ${response.status}`);
    console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));

    // Log response body for debugging
    if (!response.ok) {
      const responseText = await response.text();
      console.error('Error response body:', responseText);

      // Try to determine if it's HTML or JSON
      if (responseText.trim().startsWith('<')) {
        console.error('Received HTML instead of JSON - likely a 404 or server error');
        throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}`);
      }

      // Re-create response object since we consumed the body
      return new Response(responseText, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    }

    return response;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}