import { createSignal } from 'solid-js';

export interface ScheduleEntry {
  id?: string; // Optional for new entries, included when loaded from backend
  name: string;
  dayOfWeek: number; // 0-6 where 0 is Sunday
  startTimeMinutes: number; // Minutes since midnight (0-1439)
  durationMinutes: number; // Duration in minutes (15-min increments)
}

export type OverrideType = 'MODIFY' | 'SKIP' | 'ONE_TIME';

export interface ModifyOverrideData {
  name?: string;
  startTimeMinutes?: number;
  durationMinutes?: number;
}

export interface OneTimeOverrideData {
  name: string;
  startTimeMinutes: number;
  durationMinutes: number;
}

export interface ScheduleOverride {
  id: string;
  scheduleId: string;
  overrideDate: string; // ISO date string (YYYY-MM-DD)
  overrideType: OverrideType;
  baseEntryId?: string; // For MODIFY/SKIP
  overrideData?: ModifyOverrideData | OneTimeOverrideData;
}

export interface MaterializedEntry {
  id: string;
  name: string;
  dayOfWeek: number;
  startTimeMinutes: number;
  durationMinutes: number;
  date: string;
  isOverride: boolean;
  overrideType?: OverrideType;
  baseEntryId?: string; // Changed from baseEntryIndex to baseEntryId
}

export interface SchedulePhase {
  id: string;
  scheduleId: string;
  name?: string;
  startDate?: string; // ISO date (YYYY-MM-DD)
  endDate?: string;   // ISO date (YYYY-MM-DD)
  entries: ScheduleEntry[];
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  profileImageUrl: string;
}

export interface Schedule {
  id: string;
  name: string;
  timeZone: string;
  icalUrl: string;
  ownerId: string;
  sharedUserIds: string[];
  phases: SchedulePhase[];
  // Backward compatibility: entries are still available as aggregated view
  entries: ScheduleEntry[];
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

    async getSchedule(id: string): Promise<{ schedule: Schedule }> {
      return fetchJson(`/schedules/${id}`);
    },

    async updateSchedule(id: string, updates: { name?: string; timeZone?: string }): Promise<{ schedule: Schedule }> {
      return fetchJson(`/schedules/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },

    async addScheduleEntry(id: string, entry: ScheduleEntry): Promise<{ schedule: Schedule }> {
      return fetchJson(`/schedules/${id}/entries`, {
        method: 'POST',
        body: JSON.stringify(entry),
      });
    },

    async updateScheduleEntry(id: string, index: number, entry: ScheduleEntry): Promise<{ schedule: Schedule }> {
      return fetchJson(`/schedules/${id}/entries/${index}`, {
        method: 'PUT',
        body: JSON.stringify(entry),
      });
    },

    async deleteScheduleEntry(id: string, index: number): Promise<{ schedule: Schedule }> {
      return fetchJson(`/schedules/${id}/entries/${index}`, {
        method: 'DELETE',
      });
    },

    async deleteSchedule(id: string): Promise<{ message: string }> {
      return fetchJson(`/schedules/${id}`, {
        method: 'DELETE',
      });
    },

    // Overrides
    async getScheduleOverrides(scheduleId: string): Promise<{ overrides: ScheduleOverride[] }> {
      return fetchJson(`/schedules/${scheduleId}/overrides`);
    },

    async getScheduleOverridesInRange(
      scheduleId: string, 
      startDate: string, 
      endDate: string
    ): Promise<{ overrides: ScheduleOverride[] }> {
      return fetchJson(`/schedules/${scheduleId}/overrides/range?startDate=${startDate}&endDate=${endDate}`);
    },

    async createOverride(
      scheduleId: string,
      override: {
        overrideDate: string;
        overrideType: OverrideType;
        baseEntryId?: string;
        overrideData?: ModifyOverrideData | OneTimeOverrideData;
      }
    ): Promise<{ override: ScheduleOverride }> {
      return fetchJson(`/schedules/${scheduleId}/overrides`, {
        method: 'POST',
        body: JSON.stringify(override),
      });
    },

    async updateOverride(
      overrideId: string,
      updates: {
        overrideDate?: string;
        overrideType?: OverrideType;
        baseEntryId?: string;
        overrideData?: ModifyOverrideData | OneTimeOverrideData;
      }
    ): Promise<{ override: ScheduleOverride }> {
      return fetchJson(`/overrides/${overrideId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },

    async deleteOverride(overrideId: string): Promise<{ message: string }> {
      return fetchJson(`/overrides/${overrideId}`, {
        method: 'DELETE',
      });
    },

    // Convenience aliases for component compatibility
    async createScheduleOverride(
      scheduleId: string,
      override: {
        overrideDate: string;
        overrideType: OverrideType;
        baseEntryId?: string;
        overrideData?: ModifyOverrideData | OneTimeOverrideData;
      }
    ): Promise<{ override: ScheduleOverride }> {
      return this.createOverride(scheduleId, override);
    },

    async updateScheduleOverride(
      _scheduleId: string, // Unused but kept for API consistency
      overrideId: string,
      updates: {
        overrideDate?: string;
        overrideType?: OverrideType;
        baseEntryId?: string;
        overrideData?: ModifyOverrideData | OneTimeOverrideData;
      }
    ): Promise<{ override: ScheduleOverride }> {
      return this.updateOverride(overrideId, updates);
    },

    async deleteScheduleOverride(_scheduleId: string, overrideId: string): Promise<{ message: string }> {
      return this.deleteOverride(overrideId);
    },

    // Phase Management
    async createSchedulePhase(
      scheduleId: string,
      phase: {
        name?: string;
        startDate?: string;
        endDate?: string;
      }
    ): Promise<{ phase: SchedulePhase }> {
      return fetchJson<{ phase: SchedulePhase }>(`/schedules/${scheduleId}/phases`, {
        method: 'POST',
        body: JSON.stringify(phase),
      });
    },

    async updateSchedulePhase(
      scheduleId: string,
      phaseId: string,
      updates: {
        name?: string;
        startDate?: string;
        endDate?: string;
      }
    ): Promise<{ phase: SchedulePhase }> {
      return fetchJson<{ phase: SchedulePhase }>(`/schedules/${scheduleId}/phases/${phaseId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },

    async deleteSchedulePhase(scheduleId: string, phaseId: string): Promise<{ message: string }> {
      return fetchJson<{ message: string }>(`/schedules/${scheduleId}/phases/${phaseId}`, {
        method: 'DELETE',
      });
    },

    async addPhaseEntry(
      scheduleId: string,
      phaseId: string,
      entry: {
        name: string;
        dayOfWeek: number;
        startTimeMinutes: number;
        durationMinutes: number;
      }
    ): Promise<{ phase: SchedulePhase }> {
      return fetchJson<{ phase: SchedulePhase }>(`/schedules/${scheduleId}/phases/${phaseId}/entries`, {
        method: 'POST',
        body: JSON.stringify(entry),
      });
    },

    async updatePhaseEntry(
      scheduleId: string,
      phaseId: string,
      entryId: string,
      entry: {
        name: string;
        dayOfWeek: number;
        startTimeMinutes: number;
        durationMinutes: number;
      }
    ): Promise<{ phase: SchedulePhase }> {
      return fetchJson<{ phase: SchedulePhase }>(`/schedules/${scheduleId}/phases/${phaseId}/entries/${entryId}`, {
        method: 'PUT',
        body: JSON.stringify(entry),
      });
    },

    async deletePhaseEntry(
      scheduleId: string,
      phaseId: string,
      entryId: string
    ): Promise<{ phase: SchedulePhase }> {
      return fetchJson<{ phase: SchedulePhase }>(`/schedules/${scheduleId}/phases/${phaseId}/entries/${entryId}`, {
        method: 'DELETE',
      });
    },
    
    // Sharing
    async getScheduleUsers(scheduleId: string): Promise<{ owner: User; sharedUsers: User[] }> {
      return fetchJson(`/schedules/${scheduleId}/users`);
    },

    async addSharedUser(scheduleId: string, email: string): Promise<{ schedule: Schedule }> {
      return fetchJson(`/schedules/${scheduleId}/users`, {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },

    async removeSharedUser(scheduleId: string, userId: string): Promise<{ schedule: Schedule }> {
      return fetchJson(`/schedules/${scheduleId}/users/${userId}`, {
        method: 'DELETE',
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
