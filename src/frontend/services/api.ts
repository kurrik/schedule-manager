import { createSignal } from 'solid-js';

export interface Schedule {
  id: string;
  name: string;
  timeZone: string;
  icalUrl: string;
  ownerId: string;
  sharedUserIds: string[];
  entries: Array<{
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    dayOfWeek: number;
  }>;
}

const API_BASE_URL = '/api';

export function useApi() {
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<Error | null>(null);

  async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Request failed');
      }

      return response.json();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An unknown error occurred'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  return {
    isLoading,
    error,
    
    // Schedules
    async getSchedules(): Promise<{ schedules: Schedule[] }> {
      return fetchJson('/schedules');
    },
    
    async createSchedule(name: string, timeZone: string): Promise<{ schedule: Schedule }> {
      return fetchJson('/schedules', {
        method: 'POST',
        body: JSON.stringify({ name, timeZone }),
      });
    },
    
    // Auth
    async getCurrentUser() {
      return fetchJson<{ name: string; email: string }>('/me');
    },
    
    async signOut() {
      return fetch('/auth/signout', { method: 'POST', credentials: 'include' });
    },
  };
}

export type ApiClient = ReturnType<typeof useApi>;
