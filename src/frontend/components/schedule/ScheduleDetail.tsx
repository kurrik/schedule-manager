import { Component, createSignal, onMount, Show, For } from 'solid-js';
import { useParams, A, useNavigate } from '@solidjs/router';
import { useApi, type Schedule, type ScheduleEntry } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';

const ScheduleDetail: Component = () => {
  const params = useParams();
  const api = useApi();
  const navigate = useNavigate();
  const [schedule, setSchedule] = createSignal<Schedule | null>(null);
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [showAddEntryModal, setShowAddEntryModal] = createSignal(false);
  const [showEditModal, setShowEditModal] = createSignal(false);
  const [showEditScheduleModal, setShowEditScheduleModal] = createSignal(false);
  const [showDeleteScheduleModal, setShowDeleteScheduleModal] = createSignal(false);
  const [editingEntryIndex, setEditingEntryIndex] = createSignal<number | null>(null);
  const [scheduleForm, setScheduleForm] = createSignal({
    name: '',
    timeZone: '',
  });
  const [currentViewDate, setCurrentViewDate] = createSignal(new Date());
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

  const handleDeleteSchedule = async () => {
    if (!schedule()) return;

    try {
      setIsLoading(true);
      await api.deleteSchedule(schedule()!.id);
      setShowDeleteScheduleModal(false);
      navigate('/'); // Redirect to schedule list
    } catch (err) {
      console.error('Failed to delete schedule:', err);
      setError('Failed to delete schedule');
      setIsLoading(false);
      setShowDeleteScheduleModal(false);
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

  // Calendar view utilities
  const formatMonthYear = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentViewDate());
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentViewDate(newDate);
  };

  // Generate calendar days for the current month view
  const calendarDays = () => {
    const viewDate = currentViewDate();
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Get the day of week for the first day (0 = Sunday)
    const startingDayOfWeek = firstDay.getDay();
    
    // Total days to show (6 weeks * 7 days = 42 days)
    const totalDays = 42;
    const days = [];
    
    // Start from the beginning of the week containing the first day
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startingDayOfWeek);
    
    for (let i = 0; i < totalDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const isCurrentMonth = currentDate.getMonth() === month;
      const dayOfWeek = currentDate.getDay();
      
      // Find entries for this day of week
      const dayEntries = schedule()?.entries.filter(entry => entry.dayOfWeek === dayOfWeek) || [];
      
      days.push({
        date: currentDate,
        day: currentDate.getDate(),
        isCurrentMonth,
        dayOfWeek,
        entries: dayEntries,
      });
    }
    
    return days;
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
                <button 
                  class="btn btn-ghost btn-sm text-error" 
                  onClick={() => setShowDeleteScheduleModal(true)}
                  title="Delete schedule"
                >
                  🗑️
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
          <div class="bg-base-200 rounded-lg p-6 mb-8">
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

          {/* Monthly Calendar View */}
          <div class="bg-base-200 rounded-lg p-6">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-xl font-semibold">Calendar View</h2>
              <div class="flex items-center gap-4">
                <button 
                  class="btn btn-outline btn-sm"
                  onClick={() => navigateMonth('prev')}
                >
                  ← Previous
                </button>
                <span class="text-lg font-medium min-w-48 text-center">
                  {formatMonthYear(currentViewDate())}
                </span>
                <button 
                  class="btn btn-outline btn-sm"
                  onClick={() => navigateMonth('next')}
                >
                  Next →
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div class="grid grid-cols-7 gap-1">
              {/* Day headers */}
              <For each={dayNames}>
                {(dayName) => (
                  <div class="p-2 text-center font-semibold text-sm bg-base-300">
                    {dayName.slice(0, 3)}
                  </div>
                )}
              </For>

              {/* Calendar days */}
              <For each={calendarDays()}>
                {(day) => (
                  <div class={`min-h-24 p-1 border border-base-300 ${
                    day.isCurrentMonth ? 'bg-base-100' : 'bg-base-300/50'
                  }`}>
                    <div class={`text-sm font-medium mb-1 ${
                      day.isCurrentMonth ? 'text-base-content' : 'text-base-content/50'
                    }`}>
                      {day.day}
                    </div>
                    <div class="space-y-1">
                      <For each={day.entries}>
                        {(entry) => (
                          <div class="bg-primary text-primary-content text-xs p-1 rounded truncate">
                            <div class="font-medium">{entry.name}</div>
                            <div class="opacity-90">
                              {formatTime(entry.startTimeMinutes)}
                            </div>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                )}
              </For>
            </div>

            <div class="mt-4 text-sm text-gray-600">
              <p>This calendar shows when your recurring schedule entries will occur each month.</p>
              <p class="mt-1">Future override functionality will allow you to modify or cancel specific dates.</p>
            </div>
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

        {/* Delete Schedule Modal */}
        <Show when={showDeleteScheduleModal()}>
          <div class="modal modal-open">
            <div class="modal-box">
              <h2 class="font-bold text-lg text-error mb-4">Delete Schedule</h2>
              <p class="mb-4">
                Are you sure you want to delete "<strong>{schedule()?.name}</strong>"? 
                This will permanently delete the schedule and all its entries. This action cannot be undone.
              </p>
              <div class="bg-warning/20 p-3 rounded mb-4">
                <p class="text-sm">
                  ⚠️ This will also invalidate the iCal feed URL, so any calendar subscriptions will stop working.
                </p>
              </div>
              <div class="flex justify-end">
                <button 
                  type="button" 
                  class="btn btn-ghost mr-2" 
                  onClick={() => setShowDeleteScheduleModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  class="btn btn-error" 
                  onClick={handleDeleteSchedule}
                >
                  Delete Schedule
                </button>
              </div>
            </div>
          </div>
        </Show>
      </Show>
    </Show>
  );
};

export default ScheduleDetail;