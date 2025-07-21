// API helper function
export async function apiRequest(endpoint: string, options?: RequestInit) {
  console.log(`Making API request to: ${endpoint}`);
  console.log('Request options:', options);

  const baseUrl = import.meta.env.VITE_API_URL || '';
  const url = `${baseUrl}${endpoint}`;

  console.log('Full URL:', url);

  const defaultOptions: RequestInit = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Ensure method is properly set - default to GET if not specified
  if (!options?.method) {
    defaultOptions.method = 'GET';
  }

  const finalOptions = { ...defaultOptions, ...options };
  console.log('Final request options:', finalOptions);

  try {
    const response = await fetch(url, finalOptions);
    console.log('Response status:', response.status);
    console.log('Response headers:', [...response.headers.entries()]);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error response:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('API response data:', data);
    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}