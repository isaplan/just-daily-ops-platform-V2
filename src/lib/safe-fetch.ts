/**
 * Safe Fetch Utility
 * Handles fetch requests with proper error handling and JSON parsing
 * Prevents "Unexpected token '<'" errors when API returns HTML
 */

export interface SafeFetchOptions extends RequestInit {
  timeout?: number;
}

export interface SafeFetchResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

/**
 * Safe fetch that handles HTML responses and errors gracefully
 */
export async function safeFetch<T = any>(
  url: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResponse<T>> {
  const { timeout = 30000, ...fetchOptions } = options;

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = timeout
      ? setTimeout(() => controller.abort(), timeout)
      : null;

    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    if (timeoutId) clearTimeout(timeoutId);

    // Check if response is OK
    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      
      // If it's HTML (error page), extract error message
      if (contentType?.includes("text/html")) {
        const text = await response.text();
        // Try to extract error from HTML
        const errorMatch = text.match(/<title>(.*?)<\/title>/i) || 
                          text.match(/<h1>(.*?)<\/h1>/i);
        const errorMessage = errorMatch 
          ? errorMatch[1] 
          : `HTTP ${response.status}: ${response.statusText}`;
        
        return {
          success: false,
          error: errorMessage,
          status: response.status,
        };
      }

      // If it's JSON error response, parse it
      if (contentType?.includes("application/json")) {
        try {
          const errorData = await response.json();
          return {
            success: false,
            error: errorData.error || errorData.message || `HTTP ${response.status}`,
            status: response.status,
          };
        } catch {
          // Fallback if JSON parsing fails
          return {
            success: false,
            error: `HTTP ${response.status}: ${response.statusText}`,
            status: response.status,
          };
        }
      }

      // Other content types
      const text = await response.text();
      return {
        success: false,
        error: text.substring(0, 200) || `HTTP ${response.status}: ${response.statusText}`,
        status: response.status,
      };
    }

    // Check content type before parsing JSON
    const contentType = response.headers.get("content-type");
    
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      return {
        success: false,
        error: `Expected JSON but got ${contentType || "unknown"}. Response: ${text.substring(0, 200)}`,
        status: response.status,
      };
    }

    // Parse JSON safely
    const data = await response.json();
    
    return {
      success: true,
      data: data as T,
      status: response.status,
    };

  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return {
          success: false,
          error: `Request timeout after ${timeout}ms`,
        };
      }
      return {
        success: false,
        error: error.message,
      };
    }
    return {
      success: false,
      error: "Unknown error occurred",
    };
  }
}

/**
 * Safe JSON fetch - throws error if not successful (for use in try/catch)
 */
export async function safeFetchJson<T = any>(
  url: string,
  options: SafeFetchOptions = {}
): Promise<T> {
  const result = await safeFetch<T>(url, options);
  
  if (!result.success) {
    throw new Error(result.error || "Fetch failed");
  }
  
  return result.data!;
}




