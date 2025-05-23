import { Component, createSignal, onMount, Show, For } from 'solid-js';
import { useParams, A } from '@solidjs/router';
import { useApi, type Schedule, type ScheduleEntry } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';

const ScheduleDetail: Component = () => {
  const params = useParams();
  const api = useApi();
  const [schedule, setSchedule] = createSignal<Schedule | null>(null);
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [showAddEntryModal, setShowAddEntryModal] = createSignal(false);
  const [showEditModal, setShowEditModal] = createSignal(false);
  const [showEditScheduleModal, setShowEditScheduleModal] = createSignal(false);
  const [editingEntryIndex, setEditingEntryIndex] = createSignal<number | null>(null);
  const [scheduleForm, setScheduleForm] = createSignal({
    name: '',
    timeZone: '',
  });
  const [entryForm, setEntryForm] = createSignal<ScheduleEntry>({
    name: '',
    dayOfWeek: 0,
    startTimeMinutes: 540, // 9:00 AM
    durationMinutes: 60,
  });

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const loadSchedule = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getSchedule(params.id);
      setSchedule(data.schedule);
    } catch (err) {
      console.error('Failed to load schedule:', err);
      setError('Failed to load schedule');
    } finally {
      setIsLoading(false);
    }
  };

  onMount(() => {
    loadSchedule();
  });

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${ampm}`;
  };

  const timeToMinutes = (timeStr: string): number => {
    const [time, ampm] = timeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let totalMinutes = (hours % 12) * 60 + minutes;
    if (ampm === 'PM' && hours !== 12) totalMinutes += 12 * 60;
    if (ampm === 'AM' && hours === 12) totalMinutes = minutes;
    return totalMinutes;
  };

  const handleAddEntry = async (e: Event) => {
    e.preventDefault();
    if (!schedule()) return;

    try {
      setIsLoading(true);
      await api.addScheduleEntry(schedule()!.id, entryForm());
      setShowAddEntryModal(false);
      setEntryForm({
        name: '',
        dayOfWeek: 0,
        startTimeMinutes: 540,
        durationMinutes: 60,
      });
      await loadSchedule();
    } catch (err) {
      console.error('Failed to add entry:', err);
      setError('Failed to add entry');
      setIsLoading(false);
    }
  };

  const handleEditEntry = async (e: Event) => {
    e.preventDefault();
    if (!schedule() || editingEntryIndex() === null) return;

    try {
      setIsLoading(true);
      await api.updateScheduleEntry(schedule()!.id, editingEntryIndex()!, entryForm());
      setShowEditModal(false);
      setEditingEntryIndex(null);
      await loadSchedule();
    } catch (err) {
      console.error('Failed to update entry:', err);
      setError('Failed to update entry');
      setIsLoading(false);
    }
  };

  const handleDeleteEntry = async (index: number) => {
    if (!schedule() || !confirm('Are you sure you want to delete this entry?')) return;

    try {
      setIsLoading(true);
      await api.deleteScheduleEntry(schedule()!.id, index);
      await loadSchedule();
    } catch (err) {
      console.error('Failed to delete entry:', err);
      setError('Failed to delete entry');
      setIsLoading(false);
    }
  };

  const openEditModal = (index: number) => {
    const entry = schedule()!.entries[index];
    setEntryForm({ ...entry });
    setEditingEntryIndex(index);
    setShowEditModal(true);
  };

  const openEditScheduleModal = () => {
    const currentSchedule = schedule()!;
    setScheduleForm({
      name: currentSchedule.name,
      timeZone: currentSchedule.timeZone,
    });
    setShowEditScheduleModal(true);
  };

  const handleUpdateSchedule = async (e: Event) => {
    e.preventDefault();
    if (!schedule()) return;

    try {
      setIsLoading(true);
      await api.updateSchedule(schedule()!.id, scheduleForm());
      setShowEditScheduleModal(false);
      await loadSchedule();
    } catch (err) {
      console.error('Failed to update schedule:', err);
      setError('Failed to update schedule');
      setIsLoading(false);
    }
  };

  // Group entries by day of week for the weekly grid
  const entriesByDay = () => {
    if (!schedule()) return Array(7).fill([]);
    
    const grouped = Array(7).fill(null).map(() => []);
    schedule()!.entries.forEach((entry, index) => {
      grouped[entry.dayOfWeek].push({ ...entry, index });
    });
    return grouped;
  };

  return (
    <Show when={!isLoading()} fallback={<LoadingSpinner fullScreen={false} />}>
      <Show when={schedule() && !error()} fallback={<div class="alert alert-error">{error()}</div>}>
        <div class="container mx-auto py-8">
          {/* Header */}
          <div class="flex justify-between items-center mb-6">
            <div>
              <div class="breadcrumbs text-sm mb-2">
                <ul>
                  <li><A href="/">Schedules</A></li>
                  <li>{schedule()?.name}</li>
                </ul>
              </div>
              <div class="flex items-center gap-2">
                <h1 class="text-3xl font-bold">{schedule()?.name}</h1>
                <button 
                  class="btn btn-ghost btn-sm" 
                  onClick={openEditScheduleModal}
                  title="Edit schedule"
                >
                  ✏️
                </button>
              </div>
              <p class="text-gray-600">Time Zone: {schedule()?.timeZone}</p>
            </div>
            <button 
              class="btn btn-primary" 
              onClick={() => setShowAddEntryModal(true)}
            >
              + Add Entry
            </button>
          </div>

          {/* Weekly Grid */}
          <div class="grid grid-cols-1 md:grid-cols-7 gap-4 mb-8">
            <For each={dayNames}>{(dayName, dayIndex) => (
              <div class="bg-base-200 rounded-lg p-4">
                <h3 class="font-semibold text-center mb-3">{dayName}</h3>
                <div class="space-y-2">
                  <For each={entriesByDay()[dayIndex()]}>
                    {(entry: any) => (
                      <div 
                        class="bg-primary text-primary-content p-2 rounded cursor-pointer hover:bg-primary-focus"
                        onClick={() => openEditModal(entry.index)}
                      >
                        <div class="text-sm font-medium">{entry.name}</div>
                        <div class="text-xs opacity-90">
                          {formatTime(entry.startTimeMinutes)} - {formatTime(entry.startTimeMinutes + entry.durationMinutes)}
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            )}</For>
          </div>

          {/* iCal Feed Section */}
          <div class="bg-base-200 rounded-lg p-6">
            <h2 class="text-xl font-semibold mb-4">iCal Feed</h2>
            <div class="flex items-center gap-4">
              <input 
                class="input input-bordered flex-1" 
                value={`${window.location.origin}/ical/${schedule()?.icalUrl}`}
                readonly
              />
              <button 
                class="btn btn-outline"
                onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/ical/${schedule()?.icalUrl}`)}
              >
                Copy
              </button>
            </div>
            <p class="text-sm text-gray-600 mt-2">
              Use this URL to subscribe to this schedule in your calendar app.
            </p>
          </div>
        </div>

        {/* Add Entry Modal */}
        <Show when={showAddEntryModal()}>
          <div class="modal modal-open">
            <div class="modal-box">
              <h2 class="font-bold text-lg mb-4">Add Schedule Entry</h2>
              <form onSubmit={handleAddEntry}>
                <div class="mb-4">
                  <label class="block mb-1">Name</label>
                  <input
                    class="input input-bordered w-full"
                    value={entryForm().name}
                    onInput={(e) => setEntryForm({ ...entryForm(), name: e.currentTarget.value })}
                    required
                  />
                </div>
                <div class="mb-4">
                  <label class="block mb-1">Day of Week</label>
                  <select
                    class="select select-bordered w-full"
                    value={entryForm().dayOfWeek}
                    onChange={(e) => setEntryForm({ ...entryForm(), dayOfWeek: parseInt(e.currentTarget.value) })}
                  >
                    <For each={dayNames}>
                      {(day, index) => <option value={index()}>{day}</option>}
                    </For>
                  </select>
                </div>
                <div class="mb-4">
                  <label class="block mb-1">Start Time</label>
                  <input
                    class="input input-bordered w-full"
                    type="time"
                    value={`${Math.floor(entryForm().startTimeMinutes / 60).toString().padStart(2, '0')}:${(entryForm().startTimeMinutes % 60).toString().padStart(2, '0')}`}
                    onInput={(e) => {
                      const [hours, minutes] = e.currentTarget.value.split(':').map(Number);
                      setEntryForm({ ...entryForm(), startTimeMinutes: hours * 60 + minutes });
                    }}
                    required
                  />
                </div>
                <div class="mb-4">
                  <label class="block mb-1">Duration (minutes)</label>
                  <input
                    class="input input-bordered w-full"
                    type="number"
                    step="15"
                    min="15"
                    value={entryForm().durationMinutes}
                    onInput={(e) => setEntryForm({ ...entryForm(), durationMinutes: parseInt(e.currentTarget.value) })}
                    required
                  />
                </div>
                <div class="flex justify-end">
                  <button type="button" class="btn btn-ghost mr-2" onClick={() => setShowAddEntryModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" class="btn btn-primary">
                    Add Entry
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Show>

        {/* Edit Entry Modal */}
        <Show when={showEditModal()}>
          <div class="modal modal-open">
            <div class="modal-box">
              <h2 class="font-bold text-lg mb-4">Edit Schedule Entry</h2>
              <form onSubmit={handleEditEntry}>
                <div class="mb-4">
                  <label class="block mb-1">Name</label>
                  <input
                    class="input input-bordered w-full"
                    value={entryForm().name}
                    onInput={(e) => setEntryForm({ ...entryForm(), name: e.currentTarget.value })}
                    required
                  />
                </div>
                <div class="mb-4">
                  <label class="block mb-1">Day of Week</label>
                  <select
                    class="select select-bordered w-full"
                    value={entryForm().dayOfWeek}
                    onChange={(e) => setEntryForm({ ...entryForm(), dayOfWeek: parseInt(e.currentTarget.value) })}
                  >
                    <For each={dayNames}>
                      {(day, index) => <option value={index()}>{day}</option>}
                    </For>
                  </select>
                </div>
                <div class="mb-4">
                  <label class="block mb-1">Start Time</label>
                  <input
                    class="input input-bordered w-full"
                    type="time"
                    value={`${Math.floor(entryForm().startTimeMinutes / 60).toString().padStart(2, '0')}:${(entryForm().startTimeMinutes % 60).toString().padStart(2, '0')}`}
                    onInput={(e) => {
                      const [hours, minutes] = e.currentTarget.value.split(':').map(Number);
                      setEntryForm({ ...entryForm(), startTimeMinutes: hours * 60 + minutes });
                    }}
                    required
                  />
                </div>
                <div class="mb-4">
                  <label class="block mb-1">Duration (minutes)</label>
                  <input
                    class="input input-bordered w-full"
                    type="number"
                    step="15"
                    min="15"
                    value={entryForm().durationMinutes}
                    onInput={(e) => setEntryForm({ ...entryForm(), durationMinutes: parseInt(e.currentTarget.value) })}
                    required
                  />
                </div>
                <div class="flex justify-end">
                  <button type="button" class="btn btn-ghost mr-2" onClick={() => setShowEditModal(false)}>
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    class="btn btn-error mr-2" 
                    onClick={() => {
                      setShowEditModal(false);
                      handleDeleteEntry(editingEntryIndex()!);
                    }}
                  >
                    Delete
                  </button>
                  <button type="submit" class="btn btn-primary">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Show>

        {/* Edit Schedule Modal */}
        <Show when={showEditScheduleModal()}>
          <div class="modal modal-open">
            <div class="modal-box">
              <h2 class="font-bold text-lg mb-4">Edit Schedule</h2>
              <form onSubmit={handleUpdateSchedule}>
                <div class="mb-4">
                  <label class="block mb-1">Name</label>
                  <input
                    class="input input-bordered w-full"
                    value={scheduleForm().name}
                    onInput={(e) => setScheduleForm({ ...scheduleForm(), name: e.currentTarget.value })}
                    required
                  />
                </div>
                <div class="mb-4">
                  <label class="block mb-1">Time Zone</label>
                  <input
                    class="input input-bordered w-full"
                    value={scheduleForm().timeZone}
                    onInput={(e) => setScheduleForm({ ...scheduleForm(), timeZone: e.currentTarget.value })}
                    placeholder="e.g., America/Los_Angeles"
                    required
                  />
                  <div class="text-xs text-gray-500 mt-1">
                    Use IANA timezone identifiers (e.g., America/New_York, Europe/London)
                  </div>
                </div>
                <div class="flex justify-end">
                  <button type="button" class="btn btn-ghost mr-2" onClick={() => setShowEditScheduleModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" class="btn btn-primary">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Show>
      </Show>
    </Show>
  );
};

export default ScheduleDetail;