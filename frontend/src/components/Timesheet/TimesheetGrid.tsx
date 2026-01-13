/**
 * Timesheet Grid Component
 * Interactive grid for entering time entries
 * Responsive: Desktop shows full week grid, Mobile shows day-by-day view
 */

import { useState, useEffect } from 'react';
import {
  makeStyles,
  tokens,
  Button,
  Input,
  Dropdown,
  Option,
  Textarea,
  Card,
  Text,
  Caption1,
  Body1Strong,
  shorthands,
  mergeClasses,
  ToggleButton,
} from '@fluentui/react-components';
import {
  Add24Regular,
  Delete24Regular,
  ChevronLeft24Regular,
  ChevronRight24Regular,
  ChevronDown24Regular,
  ChevronUp24Regular,
} from '@fluentui/react-icons';
import { TimeEntry, Project } from '../../types';
import { formatDate } from '../../services/timesheetService';

const useStyles = makeStyles({
  grid: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalS),
  },

  // Desktop week header - hidden on mobile
  weekHeader: {
    display: 'grid',
    gridTemplateColumns: '180px repeat(7, 1fr)',
    ...shorthands.gap(tokens.spacingHorizontalXS),
    ...shorthands.padding(tokens.spacingVerticalXS, tokens.spacingHorizontalS),
    backgroundColor: '#286f1f',
    color: 'white',
    ...shorthands.borderRadius('8px'),
    alignItems: 'center',
    '@media (max-width: 768px)': {
      display: 'none',
    },
  },

  // Mobile day selector - hidden on desktop
  mobileDaySelector: {
    display: 'none',
    '@media (max-width: 768px)': {
      display: 'flex',
      flexDirection: 'column',
      ...shorthands.gap(tokens.spacingVerticalS),
      ...shorthands.padding(tokens.spacingVerticalM),
      backgroundColor: tokens.colorNeutralBackground3,
      ...shorthands.borderRadius(tokens.borderRadiusMedium),
    },
  },
  mobileDayNav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.gap(tokens.spacingHorizontalM),
  },
  mobileDayInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
  },
  mobileDayDots: {
    display: 'flex',
    justifyContent: 'center',
    ...shorthands.gap(tokens.spacingHorizontalXS),
    marginTop: tokens.spacingVerticalS,
  },
  dayDot: {
    width: '8px',
    height: '8px',
    ...shorthands.borderRadius('50%'),
    backgroundColor: tokens.colorNeutralStroke1,
    cursor: 'pointer',
  },
  dayDotActive: {
    backgroundColor: tokens.colorBrandBackground,
    width: '12px',
  },
  dayDotHasEntries: {
    backgroundColor: tokens.colorPaletteGreenBackground3,
  },

  dateCell: {
    textAlign: 'center',
  },
  dateCellText: {
    color: 'white',
    fontSize: tokens.fontSizeBase200,
  },
  today: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    ...shorthands.borderRadius('4px'),
    ...shorthands.padding('2px', '4px'),
  },

  // Desktop entry row
  entryRow: {
    display: 'grid',
    gridTemplateColumns: '180px repeat(7, 1fr)',
    ...shorthands.gap(tokens.spacingHorizontalXS),
    alignItems: 'start',
    ...shorthands.padding(tokens.spacingVerticalXS),
    '@media (max-width: 768px)': {
      display: 'none',
    },
  },

  // Mobile entry card - hidden on desktop
  mobileEntryCard: {
    display: 'none',
    '@media (max-width: 768px)': {
      display: 'flex',
      flexDirection: 'column',
      ...shorthands.gap(tokens.spacingVerticalM),
      ...shorthands.padding(tokens.spacingVerticalM),
    },
  },
  mobileProjectHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    ...shorthands.padding(tokens.spacingVerticalS),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground2,
  },
  mobileProjectInfo: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalS),
    flex: 1,
  },
  mobileProjectExpanded: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalM),
    marginTop: tokens.spacingVerticalS,
  },
  mobileDayEntry: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalS),
    ...shorthands.padding(tokens.spacingVerticalS),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },
  mobileInputRow: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalM),
  },
  mobileHoursInput: {
    flex: 1,
    minWidth: '80px',
    '& input': {
      fontSize: tokens.fontSizeBase400,
      ...shorthands.padding(tokens.spacingVerticalM),
      minHeight: '44px', // Touch-friendly
    },
  },
  mobileLocationPills: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalXS),
    flexWrap: 'wrap',
  },
  mobileLocationPill: {
    minWidth: 'auto',
    ...shorthands.padding(tokens.spacingVerticalXS, tokens.spacingHorizontalM),
    fontSize: tokens.fontSizeBase200,
    height: '36px',
  },
  mobileNotesInput: {
    width: '100%',
    '& textarea': {
      minHeight: '60px',
      fontSize: tokens.fontSizeBase300,
    },
  },

  projectCell: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXXS),
  },
  hoursInput: {
    width: '100%',
    '& input': {
      textAlign: 'center',
      ...shorthands.padding(tokens.spacingVerticalXS),
    },
  },
  dayCell: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXXS),
  },
  locationPills: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalXXS),
    marginTop: tokens.spacingVerticalXXS,
  },
  locationPill: {
    minWidth: 'auto',
    ...shorthands.padding(tokens.spacingVerticalXXS, tokens.spacingHorizontalS),
    fontSize: tokens.fontSizeBase100,
    height: '24px',
  },
  notesInput: {
    minHeight: '40px',
    fontSize: tokens.fontSizeBase100,
  },

  // Desktop total row
  totalRow: {
    display: 'grid',
    gridTemplateColumns: '180px repeat(7, 1fr)',
    ...shorthands.gap(tokens.spacingHorizontalXS),
    ...shorthands.padding(tokens.spacingVerticalXS, tokens.spacingHorizontalS),
    backgroundColor: '#e8f5e3',
    ...shorthands.borderRadius('8px'),
    alignItems: 'center',
    '@media (max-width: 768px)': {
      display: 'none',
    },
  },

  // Mobile totals - hidden on desktop
  mobileTotals: {
    display: 'none',
    '@media (max-width: 768px)': {
      display: 'flex',
      flexDirection: 'column',
      ...shorthands.gap(tokens.spacingVerticalS),
      ...shorthands.padding(tokens.spacingVerticalM),
      backgroundColor: tokens.colorNeutralBackground3,
      ...shorthands.borderRadius(tokens.borderRadiusMedium),
    },
  },
  mobileTotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mobileTotalDivider: {
    height: '1px',
    backgroundColor: tokens.colorNeutralStroke2,
    marginTop: tokens.spacingVerticalXS,
    marginBottom: tokens.spacingVerticalXS,
  },

  totalCell: {
    textAlign: 'center',
    fontWeight: tokens.fontWeightSemibold,
  },
  addButton: {
    marginTop: tokens.spacingVerticalM,
    '@media (max-width: 768px)': {
      width: '100%',
      minHeight: '44px',
    },
  },
  deleteButton: {
    marginTop: tokens.spacingVerticalS,
  },

  weekTotalDesktop: {
    textAlign: 'right',
    paddingRight: tokens.spacingHorizontalM,
    '@media (max-width: 768px)': {
      display: 'none',
    },
  },

  // Mobile nav buttons
  mobileNavButton: {
    minWidth: '44px',
    minHeight: '44px',
  },

  // Mobile dropdown styling
  mobileDropdown: {
    width: '100%',
    '& button': {
      minHeight: '44px',
      fontSize: tokens.fontSizeBase300,
    },
  },

  // Badge for hours on collapsed project
  hoursBadge: {
    ...shorthands.padding(tokens.spacingVerticalXXS, tokens.spacingHorizontalS),
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
  },
});

interface TimesheetGridProps {
  weekDates: Date[];
  entries: TimeEntry[];
  projects: Project[];
  hoursByDate: Record<string, number>;
  totalHours: number;
  onUpdateEntry: (entry: Partial<TimeEntry>) => void;
  onDeleteEntry: (entryId: number) => void;
  disabled?: boolean;
}

interface GridEntry {
  projectId: number;
  projectName: string;
  dailyEntries: Record<string, {
    hours: number;
    location: 'Office' | 'WFH' | 'Other';
    notes?: string;
    entryId?: number;
  }>;
}

export const TimesheetGrid: React.FC<TimesheetGridProps> = ({
  weekDates,
  entries,
  projects,
  hoursByDate,
  totalHours,
  onUpdateEntry,
  onDeleteEntry,
  disabled = false,
}) => {
  const styles = useStyles();
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(() => {
    // Default to today if it's in the week, otherwise Monday
    const todayStr = formatDate(new Date());
    const todayIndex = weekDates.findIndex(d => formatDate(d) === todayStr);
    return todayIndex >= 0 ? todayIndex : 0;
  });
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());

  // Initialize with Standard Work, PTO, Holiday projects and any projects from existing entries
  useEffect(() => {
    // Wait for projects to load
    if (projects.length === 0) return;

    const projectIdsFromEntries = [...new Set(entries.map((e) => e.projectId))];

    // Find default projects: Standard Work, PTO, and Holiday
    const standardWork = projects.find(
      (p) => p.isActive && (p.projectNumber === 'WRK-001' || p.projectName === 'Standard Work')
    );
    const fallbackWork = projects.find((p) => p.isActive && p.projectType === 'Work');
    const ptoProject = projects.find(
      (p) => p.isActive && p.projectType === 'PTO'
    );
    const holidayProject = projects.find(
      (p) => p.isActive && p.projectType === 'Holiday'
    );

    // Build default projects list (in order: Standard Work, PTO, Holiday)
    const defaultProjects: number[] = [];
    const workProject = standardWork || fallbackWork;
    if (workProject) defaultProjects.push(workProject.projectId);
    if (ptoProject) defaultProjects.push(ptoProject.projectId);
    if (holidayProject) defaultProjects.push(holidayProject.projectId);

    // Combine: default projects + projects from entries (avoiding duplicates)
    const initialProjects = [...defaultProjects];
    projectIdsFromEntries.forEach((id) => {
      if (!initialProjects.includes(id)) {
        initialProjects.push(id);
      }
    });

    // Only set if we have projects to show and either:
    // 1. selectedProjects is empty (initial load)
    // 2. entries changed and we need to add new projects from entries
    if (initialProjects.length > 0) {
      setSelectedProjects((prev) => {
        // If empty, initialize with all default projects
        if (prev.length === 0) {
          return initialProjects;
        }
        // Otherwise, add any projects from entries that aren't in selectedProjects
        const newProjects = projectIdsFromEntries.filter((id) => !prev.includes(id));
        if (newProjects.length > 0) {
          return [...prev, ...newProjects];
        }
        return prev;
      });
    }
  }, [projects, entries]);

  // Update selected day when week changes
  useEffect(() => {
    const todayStr = formatDate(new Date());
    const todayIndex = weekDates.findIndex(d => formatDate(d) === todayStr);
    if (todayIndex >= 0) {
      setSelectedDayIndex(todayIndex);
    } else {
      setSelectedDayIndex(0);
    }
  }, [weekDates]);

  // Group entries by project
  const gridEntries: GridEntry[] = selectedProjects.map((projectId) => {
    const project = projects.find((p) => p.projectId === projectId);
    const projectEntries = entries.filter((e) => e.projectId === projectId);

    const dailyEntries: GridEntry['dailyEntries'] = {};
    projectEntries.forEach((entry) => {
      // Normalize workDate to YYYY-MM-DD format for consistent matching
      const dateKey = typeof entry.workDate === 'string'
        ? entry.workDate.split('T')[0]
        : formatDate(new Date(entry.workDate));
      dailyEntries[dateKey] = {
        hours: entry.hoursWorked,
        location: entry.workLocation,
        notes: entry.notes,
        entryId: entry.timeEntryId,
      };
    });

    return {
      projectId,
      projectName: project?.projectName || 'Unknown Project',
      dailyEntries,
    };
  });

  const today = formatDate(new Date());
  const selectedDate = weekDates[selectedDayIndex];
  const selectedDateStr = selectedDate ? formatDate(selectedDate) : '';

  const handleAddProject = () => {
    // Find available projects not already selected
    const availableProjects = projects.filter(
      (p) => p.isActive && !selectedProjects.includes(p.projectId)
    );

    if (availableProjects.length === 0) return;

    // Prefer Standard Work (WRK-001) or first Work type project
    const standardWork = availableProjects.find(
      (p) => p.projectNumber === 'WRK-001' || p.projectName === 'Standard Work'
    );
    const workProject = availableProjects.find((p) => p.projectType === 'Work');
    const defaultProject = standardWork || workProject || availableProjects[0];

    setSelectedProjects([...selectedProjects, defaultProject.projectId]);
    // Auto-expand newly added project on mobile
    setExpandedProjects(prev => new Set([...prev, defaultProject.projectId]));
  };

  const handleRemoveProject = (projectId: number) => {
    setSelectedProjects(selectedProjects.filter((id) => id !== projectId));
    setExpandedProjects(prev => {
      const next = new Set(prev);
      next.delete(projectId);
      return next;
    });
    // Delete all entries for this project
    entries
      .filter((e) => e.projectId === projectId)
      .forEach((e) => onDeleteEntry(e.timeEntryId));
  };

  const handleChangeProject = (oldProjectId: number, newProjectId: number) => {
    setSelectedProjects(
      selectedProjects.map((id) => (id === oldProjectId ? newProjectId : id))
    );
    // Update expanded state
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(oldProjectId)) {
        next.delete(oldProjectId);
        next.add(newProjectId);
      }
      return next;
    });
    // Update all entries for this project
    entries
      .filter((e) => e.projectId === oldProjectId)
      .forEach((e) => {
        onUpdateEntry({ ...e, projectId: newProjectId });
      });
  };

  const handleUpdateEntry = (
    projectId: number,
    date: string,
    field: 'hours' | 'location' | 'notes',
    value: number | string
  ) => {
    const existing = entries.find((e) => e.projectId === projectId && e.workDate === date);

    if (field === 'hours' && value === 0 && existing) {
      // Delete entry if hours set to 0
      onDeleteEntry(existing.timeEntryId);
      return;
    }

    const entry: Partial<TimeEntry> = {
      projectId,
      workDate: date,
      ...(field === 'hours' && { hoursWorked: value as number }),
      ...(field === 'location' && { workLocation: value as 'Office' | 'WFH' | 'Other' }),
      ...(field === 'notes' && { notes: value as string }),
    };

    if (existing) {
      entry.timeEntryId = existing.timeEntryId;
      entry.timesheetId = existing.timesheetId;
    }

    onUpdateEntry(entry);
  };

  const toggleProjectExpanded = (projectId: number) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const getDayName = (date: Date): string => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getDayNameFull = (date: Date): string => {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const getDateString = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
  };

  const getDateStringFull = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };

  const goToPreviousDay = () => {
    setSelectedDayIndex(prev => Math.max(0, prev - 1));
  };

  const goToNextDay = () => {
    setSelectedDayIndex(prev => Math.min(weekDates.length - 1, prev + 1));
  };

  const getProjectHoursForDay = (gridEntry: GridEntry, dateStr: string): number => {
    return gridEntry.dailyEntries[dateStr]?.hours || 0;
  };

  const getProjectTotalHours = (gridEntry: GridEntry): number => {
    return Object.values(gridEntry.dailyEntries).reduce((sum, entry) => sum + entry.hours, 0);
  };

  const dayHasEntries = (dateStr: string): boolean => {
    return (hoursByDate[dateStr] || 0) > 0;
  };

  return (
    <div className={styles.grid}>
      {/* Desktop Week Header */}
      <div className={styles.weekHeader}>
        <Text weight="semibold" style={{ color: 'white' }}>Project</Text>
        {weekDates.map((date) => {
          const dateStr = formatDate(date);
          const isToday = dateStr === today;
          return (
            <div key={dateStr} className={`${styles.dateCell} ${isToday ? styles.today : ''}`}>
              <Text weight="semibold" className={styles.dateCellText}>
                {getDayName(date)}
              </Text>
              <Text size={100} className={styles.dateCellText}>
                {getDateString(date)}
              </Text>
            </div>
          );
        })}
      </div>

      {/* Mobile Day Selector */}
      <div className={styles.mobileDaySelector}>
        <div className={styles.mobileDayNav}>
          <Button
            appearance="subtle"
            icon={<ChevronLeft24Regular />}
            onClick={goToPreviousDay}
            disabled={selectedDayIndex === 0}
            className={styles.mobileNavButton}
            aria-label="Previous day"
          />
          <div className={styles.mobileDayInfo}>
            <Body1Strong className={selectedDateStr === today ? styles.today : undefined}>
              {selectedDate && getDayNameFull(selectedDate)}
            </Body1Strong>
            <Text className={selectedDateStr === today ? styles.today : undefined}>
              {selectedDate && getDateStringFull(selectedDate)}
            </Text>
          </div>
          <Button
            appearance="subtle"
            icon={<ChevronRight24Regular />}
            onClick={goToNextDay}
            disabled={selectedDayIndex === weekDates.length - 1}
            className={styles.mobileNavButton}
            aria-label="Next day"
          />
        </div>
        {/* Day indicator dots */}
        <div className={styles.mobileDayDots}>
          {weekDates.map((date, index) => {
            const dateStr = formatDate(date);
            const isActive = index === selectedDayIndex;
            const hasEntries = dayHasEntries(dateStr);
            return (
              <div
                key={dateStr}
                className={mergeClasses(
                  styles.dayDot,
                  isActive && styles.dayDotActive,
                  !isActive && hasEntries && styles.dayDotHasEntries
                )}
                onClick={() => setSelectedDayIndex(index)}
                role="button"
                tabIndex={0}
                aria-label={`${getDayName(date)} ${getDateString(date)}${hasEntries ? ' (has entries)' : ''}`}
              />
            );
          })}
        </div>
      </div>

      {/* Entry Rows - Desktop */}
      {gridEntries.map((gridEntry, rowIndex) => {
        const project = projects.find((p) => p.projectId === gridEntry.projectId);
        const isPtoOrHoliday = project?.projectType === 'PTO' || project?.projectType === 'Holiday';

        return (
          <Card key={gridEntry.projectId}>
            {/* Desktop View */}
            <div className={styles.entryRow}>
              {/* Project Selector */}
              <div className={styles.projectCell}>
                <Dropdown
                  placeholder="Select project"
                  value={gridEntry.projectName}
                  disabled={disabled}
                  onOptionSelect={(_, data) => {
                    if (data.optionValue) {
                      handleChangeProject(gridEntry.projectId, parseInt(data.optionValue));
                    }
                  }}
                >
                  {projects
                    .filter((p) => p.isActive)
                    .map((proj) => (
                      <Option
                        key={proj.projectId}
                        value={String(proj.projectId)}
                        text={`${proj.projectNumber} - ${proj.projectName}`}
                      >
                        {proj.projectNumber} - {proj.projectName}
                      </Option>
                    ))}
                </Dropdown>
                <Button
                  appearance="subtle"
                  size="small"
                  icon={<Delete24Regular />}
                  onClick={() => handleRemoveProject(gridEntry.projectId)}
                  disabled={disabled}
                  className={styles.deleteButton}
                >
                  Remove
                </Button>
              </div>

              {/* Daily Entries */}
              {weekDates.map((date, dayIndex) => {
                const dateStr = formatDate(date);
                const dayEntry = gridEntry.dailyEntries[dateStr] || {
                  hours: 0,
                  location: 'Office' as const,
                  notes: '',
                };

                // Tab order: row * 100 + day, so hours inputs tab Mon→Tue→Wed→etc
                const tabIndex = (rowIndex + 1) * 100 + dayIndex;

                return (
                  <div key={dateStr} className={styles.dayCell}>
                    <Input
                      type="number"
                      min="0"
                      max="24"
                      step="0.25"
                      value={String(dayEntry.hours || '')}
                      placeholder="0"
                      disabled={disabled}
                      tabIndex={tabIndex}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        handleUpdateEntry(gridEntry.projectId, dateStr, 'hours', value);
                      }}
                      className={styles.hoursInput}
                    />
                    {/* Hide location toggle for PTO/Holiday projects */}
                    {!isPtoOrHoliday && dayEntry.hours > 0 && (
                      <div className={styles.locationPills}>
                        <ToggleButton
                          size="small"
                          appearance={dayEntry.location === 'Office' ? 'primary' : 'outline'}
                          checked={dayEntry.location === 'Office'}
                          disabled={disabled}
                          className={styles.locationPill}
                          onClick={() => handleUpdateEntry(gridEntry.projectId, dateStr, 'location', 'Office')}
                        >
                          Office
                        </ToggleButton>
                        <ToggleButton
                          size="small"
                          appearance={dayEntry.location === 'WFH' ? 'primary' : 'outline'}
                          checked={dayEntry.location === 'WFH'}
                          disabled={disabled}
                          className={styles.locationPill}
                          onClick={() => handleUpdateEntry(gridEntry.projectId, dateStr, 'location', 'WFH')}
                        >
                          WFH
                        </ToggleButton>
                        <ToggleButton
                          size="small"
                          appearance={dayEntry.location === 'Other' ? 'primary' : 'outline'}
                          checked={dayEntry.location === 'Other'}
                          disabled={disabled}
                          className={styles.locationPill}
                          onClick={() => handleUpdateEntry(gridEntry.projectId, dateStr, 'location', 'Other')}
                        >
                          Other
                        </ToggleButton>
                      </div>
                    )}
                    {dayEntry.hours > 0 && (
                      <Textarea
                        placeholder="Notes..."
                        value={dayEntry.notes || ''}
                        disabled={disabled}
                        tabIndex={-1}
                        onChange={(e) => {
                          handleUpdateEntry(
                            gridEntry.projectId,
                            dateStr,
                            'notes',
                            e.target.value
                          );
                        }}
                        className={styles.notesInput}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mobile View */}
            <div className={styles.mobileEntryCard}>
              {/* Collapsible Project Header */}
              <div
                className={styles.mobileProjectHeader}
                onClick={() => toggleProjectExpanded(gridEntry.projectId)}
                role="button"
                tabIndex={0}
                aria-expanded={expandedProjects.has(gridEntry.projectId)}
              >
                <div className={styles.mobileProjectInfo}>
                  {expandedProjects.has(gridEntry.projectId) ? (
                    <ChevronUp24Regular />
                  ) : (
                    <ChevronDown24Regular />
                  )}
                  <Text weight="semibold" truncate>
                    {gridEntry.projectName}
                  </Text>
                </div>
                {/* Show hours badge for selected day when collapsed */}
                {!expandedProjects.has(gridEntry.projectId) && (
                  <span className={styles.hoursBadge}>
                    {getProjectHoursForDay(gridEntry, selectedDateStr)}h today
                  </span>
                )}
              </div>

              {/* Expanded Content */}
              {expandedProjects.has(gridEntry.projectId) && (
                <div className={styles.mobileProjectExpanded}>
                  {/* Project Dropdown */}
                  <Dropdown
                    placeholder="Select project"
                    value={gridEntry.projectName}
                    disabled={disabled}
                    className={styles.mobileDropdown}
                    onOptionSelect={(_, data) => {
                      if (data.optionValue) {
                        handleChangeProject(gridEntry.projectId, parseInt(data.optionValue));
                      }
                    }}
                  >
                    {projects
                      .filter((p) => p.isActive)
                      .map((proj) => (
                        <Option
                          key={proj.projectId}
                          value={String(proj.projectId)}
                          text={`${proj.projectNumber} - ${proj.projectName}`}
                        >
                          {proj.projectNumber} - {proj.projectName}
                        </Option>
                      ))}
                  </Dropdown>

                  {/* Entry for Selected Day */}
                  <div className={styles.mobileDayEntry}>
                    {(() => {
                      const dayEntry = gridEntry.dailyEntries[selectedDateStr] || {
                        hours: 0,
                        location: 'Office' as const,
                        notes: '',
                      };

                      return (
                        <>
                          <div className={styles.mobileInputRow}>
                            <Input
                              type="number"
                              min="0"
                              max="24"
                              step="0.25"
                              value={String(dayEntry.hours || '')}
                              placeholder="Hours"
                              disabled={disabled}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                handleUpdateEntry(gridEntry.projectId, selectedDateStr, 'hours', value);
                              }}
                              className={styles.mobileHoursInput}
                              contentBefore={<Text size={200}>Hours:</Text>}
                            />
                            {/* Location Pills - hide for PTO/Holiday */}
                            {!isPtoOrHoliday && dayEntry.hours > 0 && (
                              <div className={styles.mobileLocationPills}>
                                <ToggleButton
                                  size="small"
                                  appearance={dayEntry.location === 'Office' ? 'primary' : 'outline'}
                                  checked={dayEntry.location === 'Office'}
                                  disabled={disabled}
                                  className={styles.mobileLocationPill}
                                  onClick={() => handleUpdateEntry(gridEntry.projectId, selectedDateStr, 'location', 'Office')}
                                >
                                  Office
                                </ToggleButton>
                                <ToggleButton
                                  size="small"
                                  appearance={dayEntry.location === 'WFH' ? 'primary' : 'outline'}
                                  checked={dayEntry.location === 'WFH'}
                                  disabled={disabled}
                                  className={styles.mobileLocationPill}
                                  onClick={() => handleUpdateEntry(gridEntry.projectId, selectedDateStr, 'location', 'WFH')}
                                >
                                  WFH
                                </ToggleButton>
                                <ToggleButton
                                  size="small"
                                  appearance={dayEntry.location === 'Other' ? 'primary' : 'outline'}
                                  checked={dayEntry.location === 'Other'}
                                  disabled={disabled}
                                  className={styles.mobileLocationPill}
                                  onClick={() => handleUpdateEntry(gridEntry.projectId, selectedDateStr, 'location', 'Other')}
                                >
                                  Other
                                </ToggleButton>
                              </div>
                            )}
                          </div>
                          {/* Notes */}
                          {dayEntry.hours > 0 && (
                            <Textarea
                              placeholder="Add notes..."
                              value={dayEntry.notes || ''}
                              disabled={disabled}
                              onChange={(e) => {
                                handleUpdateEntry(
                                  gridEntry.projectId,
                                  selectedDateStr,
                                  'notes',
                                  e.target.value
                                );
                              }}
                              className={styles.mobileNotesInput}
                            />
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Week Summary for this project */}
                  <div className={styles.mobileTotalRow}>
                    <Caption1>Week total for this project:</Caption1>
                    <Body1Strong>{getProjectTotalHours(gridEntry).toFixed(2)}h</Body1Strong>
                  </div>

                  {/* Remove Project Button */}
                  <Button
                    appearance="subtle"
                    size="small"
                    icon={<Delete24Regular />}
                    onClick={() => handleRemoveProject(gridEntry.projectId)}
                    disabled={disabled}
                  >
                    Remove Project
                  </Button>
                </div>
              )}
            </div>
          </Card>
        );
      })}

      {/* Add Project Button */}
      {selectedProjects.length < projects.filter((p) => p.isActive).length && (
        <Button
          appearance="outline"
          icon={<Add24Regular />}
          onClick={handleAddProject}
          disabled={disabled}
          className={styles.addButton}
        >
          Add Project
        </Button>
      )}

      {/* Desktop Totals Row */}
      <div className={styles.totalRow}>
        <Text weight="semibold" style={{ color: '#286f1f' }}>Daily Total</Text>
        {weekDates.map((date) => {
          const dateStr = formatDate(date);
          const total = hoursByDate[dateStr] || 0;
          return (
            <div key={dateStr} className={styles.totalCell}>
              <Text weight="semibold" style={{ color: '#286f1f' }}>{total.toFixed(1)}</Text>
            </div>
          );
        })}
      </div>

      {/* Mobile Totals */}
      <div className={styles.mobileTotals}>
        <div className={styles.mobileTotalRow}>
          <Text>Today's hours:</Text>
          <Body1Strong>{(hoursByDate[selectedDateStr] || 0).toFixed(2)}h</Body1Strong>
        </div>
        <div className={styles.mobileTotalDivider} />
        <div className={styles.mobileTotalRow}>
          <Text weight="semibold">Week Total:</Text>
          <Body1Strong>{totalHours.toFixed(2)} hours</Body1Strong>
        </div>
      </div>
    </div>
  );
};
