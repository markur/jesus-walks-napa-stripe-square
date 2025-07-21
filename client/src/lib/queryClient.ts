import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

export async function apiRequest(method: "GET" | "POST" | "PUT" | "DELETE", url: string, body?: any) {
  console.log(`=== API REQUEST DEBUG: ${method} ${url} ===`);
  console.log('Request body:', body);

  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
    console.log('Stringified body:', options.body);
  }

  console.log('Request options:', options);

  try {
    const response = await fetch(url, options);

    console.log(`Response status: ${response.status}`);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    // Clone response to read it for logging without consuming it
    const responseClone = response.clone();
    const responseText = await responseClone.text();
    console.log('Response body:', responseText);

    if (!response.ok) {
      console.error(`❌ Request failed: ${response.status} ${response.statusText}`);
      console.error('Error response:', responseText);
    }

    return response;
  } catch (error) {
    console.error('❌ Network/Fetch error:', error);
    throw error;
  }
}