import { Component, createSignal, onMount, For, createEffect, Show } from 'solid-js';
import { useApi } from '../../services/api';
import { A, useParams, useLocation } from '@solidjs/router';
import LoadingSpinner from '../common/LoadingSpinner';

interface Schedule {
  id: string;
  name: string;
  timeZone: string;
  icalUrl?: string;
}

const ScheduleList: Component = () => {
  console.log('ScheduleList rendering');
  const api = useApi();
  const params = useParams();
  const location = useLocation();
  const [schedules, setSchedules] = createSignal<Schedule[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [showCreateModal, setShowCreateModal] = createSignal(false);
  const [newSchedule, setNewSchedule] = createSignal({
    name: '',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  // Log route changes
  createEffect(() => {
    console.log('Route params:', params);
    console.log('Location:', location);
  });

  const loadSchedules = async (): Promise<void> => {
    try {
      console.log('Loading schedules...');
      const data = await api.getSchedules();
      console.log('Schedules loaded:', data);
      setSchedules((data as { schedules: Schedule[] }).schedules || []);
    } catch (error) {
      console.error('Failed to load schedules:', error);
    } finally {
      setIsLoading(false);
    }
  };

  onMount(() => {
    loadSchedules();
  });

  const handleCreateSchedule = async (e: Event) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await api.createSchedule(newSchedule().name, newSchedule().timeZone);
      setShowCreateModal(false);
      setNewSchedule({ name: '', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
      await loadSchedules();
    } catch (error) {
      console.error('Failed to create schedule:', error);
      setIsLoading(false);
    }
  };

  // Use <Show> for conditional rendering based on loading state
  return (
    <Show when={!isLoading()} fallback={<LoadingSpinner fullScreen={false} />}>
      <div class="container mx-auto py-8">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-bold">Schedules</h1>
          <button class="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            + New Schedule
          </button>
        </div>
        <For each={schedules()}>{(schedule) => (
          <div class="card bg-base-200 shadow mb-4 p-4 flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <div class="font-semibold text-lg">{schedule.name}</div>
              <div class="text-sm text-gray-500">Time Zone: {schedule.timeZone}</div>
              {schedule.icalUrl && (
                <div class="text-xs mt-1">
                  <A href={schedule.icalUrl} target="_blank" class="link">iCal Feed</A>
                </div>
              )}
            </div>
            <A href={`/schedule/${schedule.id}`} class="btn btn-accent mt-2 md:mt-0">
              View
            </A>
          </div>
        )}</For>
        {/* Modal for creating a new schedule */}
        <Show when={showCreateModal()}>
          <div class="modal modal-open">
            <div class="modal-box">
              <h2 class="font-bold text-lg mb-4">Create New Schedule</h2>
              <form onSubmit={handleCreateSchedule}>
                <div class="mb-4">
                  <label class="block mb-1">Name</label>
                  <input
                    class="input input-bordered w-full"
                    value={newSchedule().name}
                    onInput={(e) => setNewSchedule({ ...newSchedule(), name: e.currentTarget.value })}
                    required
                  />
                </div>
                <div class="mb-4">
                  <label class="block mb-1">Time Zone</label>
                  <input
                    class="input input-bordered w-full"
                    value={newSchedule().timeZone}
                    onInput={(e) => setNewSchedule({ ...newSchedule(), timeZone: e.currentTarget.value })}
                    required
                  />
                </div>
                <div class="flex justify-end">
                  <button type="button" class="btn btn-ghost mr-2" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" class="btn btn-primary">
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Show>
      </div>
    </Show>
  );
}

export default ScheduleList;