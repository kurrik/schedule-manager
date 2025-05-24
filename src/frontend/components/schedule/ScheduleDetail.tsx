import { Component, createSignal, onMount, onCleanup, Show, For, createEffect } from 'solid-js';
import { useParams, A, useNavigate } from '@solidjs/router';
import { useApi, type Schedule, type ScheduleEntry, type ScheduleOverride, type MaterializedEntry } from '../../services/api';
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
  const [editingEntryId, setEditingEntryId] = createSignal<string | null>(null);
  const [scheduleForm, setScheduleForm] = createSignal({
    name: '',
    timeZone: '',
  });
  const [currentViewDate, setCurrentViewDate] = createSignal(new Date());
  const [overrides, setOverrides] = createSignal<ScheduleOverride[]>([]);
  const [showAddOneTimeModal, setShowAddOneTimeModal] = createSignal(false);
  const [showEntryActionModal, setShowEntryActionModal] = createSignal(false);
  const [selectedDate, setSelectedDate] = createSignal<string>('');
  const [selectedEntry, setSelectedEntry] = createSignal<MaterializedEntry | null>(null);
  const [entryForm, setEntryForm] = createSignal<ScheduleEntry>({
    name: '',
    dayOfWeek: 0,
    startTimeMinutes: 540, // 9:00 AM
    durationMinutes: 60,
  });
  const [oneTimeEntryForm, setOneTimeEntryForm] = createSignal({
    name: '',
    startTimeMinutes: 540, // 9:00 AM
    durationMinutes: 60,
  });
  const [modifyEntryForm, setModifyEntryForm] = createSignal({
    name: '',
    startTimeMinutes: 540,
    durationMinutes: 60,
  });
  const [showModifyModal, setShowModifyModal] = createSignal(false);

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

  const loadOverridesForMonth = async () => {
    if (!schedule()) return;

    const viewDate = currentViewDate();
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    // Get first day of month and last day of month
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    try {
      const data = await api.getScheduleOverridesInRange(schedule()!.id, startDateStr, endDateStr);
      setOverrides(data.overrides);
    } catch (err) {
      console.error('Failed to load overrides:', err);
    }
  };

  // Handle ESC key to close modals
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (showAddEntryModal()) {
        setShowAddEntryModal(false);
      } else if (showEditModal()) {
        setShowEditModal(false);
        setEditingEntryId(null);
      } else if (showEditScheduleModal()) {
        setShowEditScheduleModal(false);
      } else if (showDeleteScheduleModal()) {
        setShowDeleteScheduleModal(false);
      } else if (showAddOneTimeModal()) {
        setShowAddOneTimeModal(false);
      } else if (showEntryActionModal()) {
        setShowEntryActionModal(false);
        setSelectedEntry(null);
      } else if (showModifyModal()) {
        setShowModifyModal(false);
      }
    }
  };

  onMount(() => {
    loadSchedule();
    document.addEventListener('keydown', handleKeyDown);
  });

  // Load overrides when schedule changes or month changes
  createEffect(() => {
    if (schedule()) {
      loadOverridesForMonth();
    }
  });

  createEffect(() => {
    currentViewDate(); // Re-run when month changes
    loadOverridesForMonth();
  });

  onCleanup(() => {
    document.removeEventListener('keydown', handleKeyDown);
  });

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${ampm}`;
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
    if (!schedule() || !editingEntryId()) return;

    const entryIndex = schedule()!.entries.findIndex(entry => entry.id === editingEntryId());
    if (entryIndex === -1) return;

    try {
      setIsLoading(true);
      await api.updateScheduleEntry(schedule()!.id, entryIndex, entryForm());
      setShowEditModal(false);
      setEditingEntryId(null);
      await loadSchedule();
      await loadOverridesForMonth(); // Reload overrides after entry update
    } catch (err) {
      console.error('Failed to update entry:', err);
      setError('Failed to update entry');
      setIsLoading(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!schedule() || !editingEntryId() || !confirm('Are you sure you want to delete this entry?')) return;

    const entryIndex = schedule()!.entries.findIndex(entry => entry.id === editingEntryId());
    if (entryIndex === -1) return;

    try {
      setIsLoading(true);
      await api.deleteScheduleEntry(schedule()!.id, entryIndex);
      setShowEditModal(false);
      setEditingEntryId(null);
      await loadSchedule();
      await loadOverridesForMonth(); // Reload overrides after entry deletion
    } catch (err) {
      console.error('Failed to delete entry:', err);
      setError('Failed to delete entry');
      setIsLoading(false);
    }
  };

  const openEditModal = (entryId: string) => {
    const entry = schedule()!.entries.find(e => e.id === entryId);
    if (!entry) return;
    
    setEntryForm({ ...entry });
    setEditingEntryId(entryId);
    setShowEditModal(true);
  };

  const openAddModalForDay = (dayOfWeek: number) => {
    setEntryForm({
      name: '',
      dayOfWeek: dayOfWeek,
      startTimeMinutes: 540, // 9:00 AM
      durationMinutes: 60,
    });
    setShowAddEntryModal(true);
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
    schedule()!.entries.forEach((entry) => {
      grouped[entry.dayOfWeek].push(entry);
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

  // Materialize entries for a specific date (applying overrides)
  const materializeEntriesForDate = (date: Date): MaterializedEntry[] => {
    if (!schedule()) return [];

    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();
    
    // Get recurring entries for this day of week
    const recurringEntries = schedule()!.entries
      .filter(entry => entry.dayOfWeek === dayOfWeek);

    // Get overrides for this specific date
    const dateOverrides = overrides().filter(override => override.overrideDate === dateStr);

    const materializedEntries: MaterializedEntry[] = [];

    // Process recurring entries, applying modifications and skips
    for (const entry of recurringEntries) {
      if (!entry.id) continue; // Skip entries without IDs
      
      // Check if this entry is skipped
      const skipOverride = dateOverrides.find(
        override => override.overrideType === 'SKIP' && override.baseEntryId === entry.id
      );

      if (skipOverride) {
        continue; // Skip this entry
      }

      // Check if this entry is modified
      const modifyOverride = dateOverrides.find(
        override => override.overrideType === 'MODIFY' && override.baseEntryId === entry.id
      );

      if (modifyOverride && modifyOverride.overrideData) {
        // Apply modifications
        const modifyData = modifyOverride.overrideData as any;
        materializedEntries.push({
          id: modifyOverride.id,
          name: modifyData.name ?? entry.name,
          dayOfWeek: entry.dayOfWeek,
          startTimeMinutes: modifyData.startTimeMinutes ?? entry.startTimeMinutes,
          durationMinutes: modifyData.durationMinutes ?? entry.durationMinutes,
          date: dateStr,
          isOverride: true,
          overrideType: 'MODIFY',
          baseEntryId: entry.id,
        });
      } else {
        // Use original recurring entry
        materializedEntries.push({
          id: entry.id,
          name: entry.name,
          dayOfWeek: entry.dayOfWeek,
          startTimeMinutes: entry.startTimeMinutes,
          durationMinutes: entry.durationMinutes,
          date: dateStr,
          isOverride: false,
        });
      }
    }

    // Add one-time entries
    const oneTimeOverrides = dateOverrides.filter(override => override.overrideType === 'ONE_TIME');
    for (const override of oneTimeOverrides) {
      if (override.overrideData) {
        const oneTimeData = override.overrideData as any;
        materializedEntries.push({
          id: override.id,
          name: oneTimeData.name,
          dayOfWeek: dayOfWeek,
          startTimeMinutes: oneTimeData.startTimeMinutes,
          durationMinutes: oneTimeData.durationMinutes,
          date: dateStr,
          isOverride: true,
          overrideType: 'ONE_TIME',
        });
      }
    }

    // Sort by start time
    materializedEntries.sort((a, b) => a.startTimeMinutes - b.startTimeMinutes);

    return materializedEntries;
  };

  // Generate calendar days for the current month view
  const calendarDays = () => {
    const viewDate = currentViewDate();
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    
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
      const materializedEntries = materializeEntriesForDate(currentDate);
      
      days.push({
        date: currentDate,
        day: currentDate.getDate(),
        isCurrentMonth,
        entries: materializedEntries,
      });
    }
    
    return days;
  };

  const handleCalendarDateClick = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    openAddOneTimeModal(dateStr);
  };

  const handleEntryClick = (entry: MaterializedEntry, e: Event) => {
    e.stopPropagation(); // Prevent day click from firing
    setSelectedEntry(entry);
    setSelectedDate(entry.date);
    setShowEntryActionModal(true);
  };

  const handleCreateOneTimeEntry = async (e: Event) => {
    e.preventDefault();
    if (!schedule()) return;

    try {
      setIsLoading(true);
      const overrideData = {
        overrideType: 'ONE_TIME' as const,
        overrideDate: selectedDate(),
        overrideData: oneTimeEntryForm(),
      };
      
      await api.createScheduleOverride(schedule()!.id, overrideData);
      setShowAddOneTimeModal(false);
      setOneTimeEntryForm({
        name: '',
        startTimeMinutes: 540,
        durationMinutes: 60,
      });
      await loadOverridesForMonth();
    } catch (err) {
      console.error('Failed to create one-time entry:', err);
      setError('Failed to create one-time entry');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipEntry = async () => {
    const entry = selectedEntry();
    if (!schedule() || !entry || entry.isOverride) return;

    try {
      setIsLoading(true);
      const overrideData = {
        overrideType: 'SKIP' as const,
        overrideDate: selectedDate(),
        baseEntryId: entry.baseEntryId || entry.id,
      };
      
      await api.createScheduleOverride(schedule()!.id, overrideData);
      setShowEntryActionModal(false);
      setSelectedEntry(null);
      await loadOverridesForMonth();
    } catch (err) {
      console.error('Failed to skip entry:', err);
      setError('Failed to skip entry');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModifyEntry = () => {
    const entry = selectedEntry();
    if (!entry) return;

    setModifyEntryForm({
      name: entry.name,
      startTimeMinutes: entry.startTimeMinutes,
      durationMinutes: entry.durationMinutes,
    });
    setShowEntryActionModal(false);
    setShowModifyModal(true);
  };

  const handleSaveModifiedEntry = async (e: Event) => {
    e.preventDefault();
    const entry = selectedEntry();
    if (!schedule() || !entry) return;

    try {
      setIsLoading(true);
      const overrideData = {
        overrideType: 'MODIFY' as const,
        overrideDate: selectedDate(),
        baseEntryId: entry.baseEntryId || entry.id,
        overrideData: modifyEntryForm(),
      };
      
      await api.createScheduleOverride(schedule()!.id, overrideData);
      setShowModifyModal(false);
      setSelectedEntry(null);
      await loadOverridesForMonth();
    } catch (err) {
      console.error('Failed to modify entry:', err);
      setError('Failed to modify entry');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditOverride = () => {
    const entry = selectedEntry();
    if (!entry || !entry.isOverride) return;

    if (entry.overrideType === 'MODIFY') {
      setModifyEntryForm({
        name: entry.name,
        startTimeMinutes: entry.startTimeMinutes,
        durationMinutes: entry.durationMinutes,
      });
      setShowEntryActionModal(false);
      setShowModifyModal(true);
    } else if (entry.overrideType === 'ONE_TIME') {
      setOneTimeEntryForm({
        name: entry.name,
        startTimeMinutes: entry.startTimeMinutes,
        durationMinutes: entry.durationMinutes,
      });
      setShowEntryActionModal(false);
      setShowAddOneTimeModal(true);
    }
  };

  const handleUpdateOverride = async (e: Event) => {
    e.preventDefault();
    const entry = selectedEntry();
    if (!entry || !entry.isOverride) return;

    try {
      setIsLoading(true);
      let overrideData;
      
      if (entry.overrideType === 'MODIFY') {
        overrideData = {
          overrideType: 'MODIFY' as const,
          overrideDate: selectedDate(),
          baseEntryId: entry.baseEntryId,
          overrideData: modifyEntryForm(),
        };
      } else if (entry.overrideType === 'ONE_TIME') {
        overrideData = {
          overrideType: 'ONE_TIME' as const,
          overrideDate: selectedDate(),
          overrideData: oneTimeEntryForm(),
        };
      }
      
      if (overrideData) {
        await api.updateScheduleOverride(schedule()!.id, entry.id, overrideData);
        if (entry.overrideType === 'MODIFY') {
          setShowModifyModal(false);
        } else {
          setShowAddOneTimeModal(false);
        }
        setSelectedEntry(null);
        await loadOverridesForMonth();
      }
    } catch (err) {
      console.error('Failed to update override:', err);
      setError('Failed to update override');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveOverride = async () => {
    const entry = selectedEntry();
    if (!entry || !entry.isOverride || !confirm('Are you sure you want to remove this override?')) return;

    try {
      setIsLoading(true);
      await api.deleteScheduleOverride(schedule()!.id, entry.id);
      setShowEntryActionModal(false);
      setSelectedEntry(null);
      await loadOverridesForMonth();
    } catch (err) {
      console.error('Failed to remove override:', err);
      setError('Failed to remove override');
    } finally {
      setIsLoading(false);
    }
  };

  const openAddOneTimeModal = (date: string) => {
    setSelectedDate(date);
    setOneTimeEntryForm({
      name: '',
      startTimeMinutes: 540,
      durationMinutes: 60,
    });
    setShowAddOneTimeModal(true);
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
          </div>

          {/* Weekly Grid */}
          <div class="grid grid-cols-1 md:grid-cols-7 gap-4 mb-8">
            <For each={dayNames}>{(dayName, dayIndex) => (
              <div class="bg-base-200 rounded-lg p-4">
                <h3 class="font-semibold text-center mb-3">{dayName}</h3>
                <div class="space-y-2 min-h-20">
                  <For each={entriesByDay()[dayIndex()]}>
                    {(entry: ScheduleEntry) => (
                      <div 
                        class="bg-primary text-primary-content p-2 rounded cursor-pointer hover:bg-primary-focus"
                        onClick={() => openEditModal(entry.id!)}
                      >
                        <div class="text-sm font-medium">{entry.name}</div>
                        <div class="text-xs opacity-90">
                          {formatTime(entry.startTimeMinutes)} - {formatTime(entry.startTimeMinutes + entry.durationMinutes)}
                        </div>
                      </div>
                    )}
                  </For>
                  <div 
                    class="border-2 border-dashed border-base-300 rounded p-4 text-center cursor-pointer hover:border-primary hover:bg-base-100 transition-colors"
                    onClick={() => openAddModalForDay(dayIndex())}
                  >
                    <div class="text-base-content/50 text-sm">
                      + Add entry
                    </div>
                  </div>
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
                {(day: any) => (
                  <div 
                    class={`min-h-24 p-1 border border-base-300 cursor-pointer hover:bg-base-200 ${
                      day.isCurrentMonth ? 'bg-base-100' : 'bg-base-300/50'
                    }`}
                    onClick={() => handleCalendarDateClick(day.date)}
                  >
                    <div class={`text-sm font-medium mb-1 ${
                      day.isCurrentMonth ? 'text-base-content' : 'text-base-content/50'
                    }`}>
                      {day.day}
                    </div>
                    <div class="space-y-1">
                      <For each={day.entries}>
                        {(entry: MaterializedEntry) => (
                          <div 
                            class={`text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 ${
                              entry.isOverride 
                                ? entry.overrideType === 'MODIFY' 
                                  ? 'bg-warning text-warning-content' 
                                  : entry.overrideType === 'ONE_TIME'
                                  ? 'bg-info text-info-content'
                                  : 'bg-primary text-primary-content'
                                : 'bg-primary text-primary-content'
                            }`}
                            onClick={(e) => handleEntryClick(entry, e)}
                            title={`Click to modify "${entry.name}"`}
                          >
                            <div class="font-medium">
                              {entry.name}
                              {entry.isOverride && (
                                <span class="ml-1 text-xs opacity-75">
                                  {entry.overrideType === 'MODIFY' ? '📝' : 
                                   entry.overrideType === 'ONE_TIME' ? '⭐' : ''}
                                </span>
                              )}
                            </div>
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
              <p>📅 <strong>Click a date</strong> to add a one-time entry, or <strong>click an entry</strong> to modify/skip it.</p>
              <div class="flex gap-4 mt-2">
                <span>🔵 Regular entries</span>
                <span>🟡 📝 Modified entries</span>
                <span>🔵 ⭐ One-time entries</span>
              </div>
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
                      handleDeleteEntry();
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

        {/* Add One-Time Entry Modal */}
        <Show when={showAddOneTimeModal()}>
          <div class="modal modal-open">
            <div class="modal-box">
              <h2 class="font-bold text-lg mb-4">
                Add One-Time Entry
                <span class="text-sm font-normal text-gray-500 ml-2">
                  ({selectedDate() && new Date(selectedDate() + 'T00:00:00').toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })})
                </span>
              </h2>
              
              <p class="text-sm text-gray-600 mb-4">
                Add a special entry that will only appear on this specific date.
              </p>

              <form onSubmit={selectedEntry()?.isOverride ? handleUpdateOverride : handleCreateOneTimeEntry}>
                <div class="mb-4">
                  <label class="block mb-1">Entry Name</label>
                  <input
                    class="input input-bordered w-full"
                    placeholder="e.g., Dentist appointment"
                    value={oneTimeEntryForm().name}
                    onInput={(e) => setOneTimeEntryForm({ ...oneTimeEntryForm(), name: e.currentTarget.value })}
                    required
                  />
                </div>
                <div class="mb-4">
                  <label class="block mb-1">Start Time</label>
                  <input
                    class="input input-bordered w-full"
                    type="time"
                    value={`${Math.floor(oneTimeEntryForm().startTimeMinutes / 60).toString().padStart(2, '0')}:${(oneTimeEntryForm().startTimeMinutes % 60).toString().padStart(2, '0')}`}
                    onInput={(e) => {
                      const [hours, minutes] = e.currentTarget.value.split(':').map(Number);
                      setOneTimeEntryForm({ ...oneTimeEntryForm(), startTimeMinutes: hours * 60 + minutes });
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
                    value={oneTimeEntryForm().durationMinutes}
                    onInput={(e) => setOneTimeEntryForm({ ...oneTimeEntryForm(), durationMinutes: parseInt(e.currentTarget.value) })}
                    required
                  />
                </div>
                <div class="flex justify-end">
                  <button 
                    type="button" 
                    class="btn btn-ghost mr-2" 
                    onClick={() => setShowAddOneTimeModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" class="btn btn-info">
                    ⭐ {selectedEntry()?.isOverride ? 'Update' : 'Add'} One-Time Entry
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Show>

        {/* Entry Action Modal */}
        <Show when={showEntryActionModal() && selectedEntry()}>
          <div class="modal modal-open">
            <div class="modal-box">
              <h2 class="font-bold text-lg mb-4">
                Manage Entry
                <span class="text-sm font-normal text-gray-500 ml-2">
                  ({selectedDate() && new Date(selectedDate() + 'T00:00:00').toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })})
                </span>
              </h2>
              
              <div class="mb-4 p-3 bg-base-200 rounded">
                <div class="font-medium">{selectedEntry()?.name}</div>
                <div class="text-sm text-gray-600">
                  {selectedEntry() && formatTime(selectedEntry()!.startTimeMinutes)} - {selectedEntry() && formatTime(selectedEntry()!.startTimeMinutes + selectedEntry()!.durationMinutes)}
                </div>
                <Show when={selectedEntry()?.isOverride}>
                  <div class="text-xs text-info mt-1">
                    This entry is already overridden ({selectedEntry()?.overrideType?.toLowerCase()})
                  </div>
                </Show>
              </div>

              <div class="space-y-3">
                <Show when={!selectedEntry()?.isOverride}>
                  <button 
                    class="btn btn-warning w-full"
                    onClick={handleModifyEntry}
                  >
                    📝 Modify this instance
                  </button>
                  <button 
                    class="btn btn-error w-full"
                    onClick={handleSkipEntry}
                  >
                    ❌ Skip this instance
                  </button>
                </Show>
                <Show when={selectedEntry()?.isOverride}>
                  <button 
                    class="btn btn-warning w-full"
                    onClick={handleEditOverride}
                  >
                    ✏️ Edit override
                  </button>
                  <button 
                    class="btn btn-error w-full"
                    onClick={handleRemoveOverride}
                  >
                    🗑️ Remove override
                  </button>
                </Show>
              </div>

              <div class="flex justify-end mt-4">
                <button 
                  type="button" 
                  class="btn btn-ghost" 
                  onClick={() => {
                    setShowEntryActionModal(false);
                    setSelectedEntry(null);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </Show>

        {/* Modify Entry Modal */}
        <Show when={showModifyModal() && selectedEntry()}>
          <div class="modal modal-open">
            <div class="modal-box">
              <h2 class="font-bold text-lg mb-4">
                Modify Entry Instance
                <span class="text-sm font-normal text-gray-500 ml-2">
                  ({selectedDate() && new Date(selectedDate() + 'T00:00:00').toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })})
                </span>
              </h2>
              
              <p class="text-sm text-gray-600 mb-4">
                Modify this instance without affecting the recurring schedule.
              </p>

              <form onSubmit={handleSaveModifiedEntry}>
                <div class="mb-4">
                  <label class="block mb-1">Entry Name</label>
                  <input
                    class="input input-bordered w-full"
                    value={modifyEntryForm().name}
                    onInput={(e) => setModifyEntryForm({ ...modifyEntryForm(), name: e.currentTarget.value })}
                    required
                  />
                </div>
                <div class="mb-4">
                  <label class="block mb-1">Start Time</label>
                  <input
                    class="input input-bordered w-full"
                    type="time"
                    value={`${Math.floor(modifyEntryForm().startTimeMinutes / 60).toString().padStart(2, '0')}:${(modifyEntryForm().startTimeMinutes % 60).toString().padStart(2, '0')}`}
                    onInput={(e) => {
                      const [hours, minutes] = e.currentTarget.value.split(':').map(Number);
                      setModifyEntryForm({ ...modifyEntryForm(), startTimeMinutes: hours * 60 + minutes });
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
                    value={modifyEntryForm().durationMinutes}
                    onInput={(e) => setModifyEntryForm({ ...modifyEntryForm(), durationMinutes: parseInt(e.currentTarget.value) })}
                    required
                  />
                </div>
                <div class="flex justify-end">
                  <button 
                    type="button" 
                    class="btn btn-ghost mr-2" 
                    onClick={() => setShowModifyModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" class="btn btn-warning">
                    📝 Save Modification
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