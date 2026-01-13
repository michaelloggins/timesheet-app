/**
 * Mobile Timesheet Entry Component
 * Optimized for quick, one-handed time entry on mobile devices
 *
 * Key UX principles:
 * - Focus on TODAY by default
 * - Big touch targets (minimum 48px)
 * - Minimal typing - use presets
 * - Clear visual feedback
 * - Easy day navigation
 */

import { useState } from 'react';
import {
  makeStyles,
  tokens,
  Button,
  Card,
  Text,
  Badge,
  Dropdown,
  Option,
  Input,
  Textarea,
  shorthands,
  Body1Strong,
  Caption1,
} from '@fluentui/react-components';
import {
  ChevronLeft24Regular,
  ChevronRight24Regular,
  Checkmark24Regular,
  Save24Regular,
  Send24Regular,
  Add24Regular,
  Delete24Regular,
  Home24Regular,
  Building24Regular,
} from '@fluentui/react-icons';
import { TimeEntry, Project } from '../../types';
import { formatDate } from '../../services/timesheetService';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100%',
    backgroundColor: tokens.colorNeutralBackground2,
  },

  // Header with week info and actions
  header: {
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalM),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacingVerticalS,
  },
  headerActions: {
    display: 'flex',
    ...shorthands.gap(tokens.spacingHorizontalS),
  },
  actionButton: {
    minHeight: '40px',
  },

  // Week navigation for switching weeks
  weekNavigation: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalXS),
    marginBottom: tokens.spacingVerticalS,
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke3),
    paddingBottom: tokens.spacingVerticalS,
  },
  weekNavButton: {
    minHeight: '36px',
  },

  // Day selector - the main navigation
  daySelector: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.padding(tokens.spacingVerticalM, 0),
  },
  dayNavButton: {
    minWidth: '48px',
    minHeight: '48px',
  },
  dayInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
  },
  dayName: {
    fontSize: tokens.fontSizeBase600,
    fontWeight: tokens.fontWeightBold,
    color: tokens.colorNeutralForeground1,
  },
  dayDate: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground3,
  },
  todayIndicator: {
    color: tokens.colorBrandForeground1,
  },

  // Week dots
  weekDots: {
    display: 'flex',
    justifyContent: 'center',
    ...shorthands.gap(tokens.spacingHorizontalS),
    ...shorthands.padding(tokens.spacingVerticalS, 0),
  },
  dayDot: {
    width: '32px',
    height: '32px',
    ...shorthands.borderRadius('50%'),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground3,
    cursor: 'pointer',
    transition: 'all 0.2s',
    ...shorthands.border('2px', 'solid', 'transparent'),
  },
  dayDotActive: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
  },
  dayDotToday: {
    ...shorthands.border('2px', 'solid', tokens.colorBrandStroke1),
  },
  dayDotHasHours: {
    backgroundColor: tokens.colorPaletteGreenBackground2,
    color: tokens.colorPaletteGreenForeground1,
  },

  // Main content area
  content: {
    flex: 1,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalM),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalM),
  },

  // Day summary card
  daySummary: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shorthands.padding(tokens.spacingVerticalM),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },
  daySummaryHours: {
    fontSize: tokens.fontSizeHero700,
    fontWeight: tokens.fontWeightBold,
    color: tokens.colorBrandForeground1,
  },
  daySummaryLabel: {
    color: tokens.colorNeutralForeground3,
  },

  // Project entries section
  entriesSection: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalM),
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Entry card - one per project for the selected day
  entryCard: {
    ...shorthands.padding(tokens.spacingVerticalM),
  },
  entryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: tokens.spacingVerticalM,
  },
  entryProject: {
    flex: 1,
  },
  projectDropdown: {
    width: '100%',
  },
  deleteEntryButton: {
    minWidth: '40px',
    minHeight: '40px',
    color: tokens.colorPaletteRedForeground1,
  },

  // Hours input with presets
  hoursSection: {
    marginBottom: tokens.spacingVerticalM,
  },
  hoursLabel: {
    marginBottom: tokens.spacingVerticalS,
    display: 'block',
  },
  hoursInputRow: {
    display: 'flex',
    ...shorthands.gap(tokens.spacingHorizontalS),
    alignItems: 'center',
  },
  hoursInput: {
    width: '80px',
    '& input': {
      textAlign: 'center',
      fontSize: tokens.fontSizeBase500,
      fontWeight: tokens.fontWeightBold,
    },
  },
  presetButtons: {
    display: 'flex',
    ...shorthands.gap(tokens.spacingHorizontalXS),
    flex: 1,
  },
  presetButton: {
    flex: 1,
    minHeight: '48px',
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
  },
  presetButtonActive: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
  },

  // Location toggle
  locationSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.padding(tokens.spacingVerticalS, 0),
  },
  locationLabel: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalS),
  },
  locationToggle: {
    display: 'flex',
    ...shorthands.gap(tokens.spacingHorizontalXS),
  },
  locationButton: {
    minWidth: '80px',
    minHeight: '44px',
  },
  locationButtonActive: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
  },

  // Notes
  notesSection: {
    marginTop: tokens.spacingVerticalS,
  },
  notesInput: {
    width: '100%',
    minHeight: '60px',
  },

  // Add project button
  addProjectButton: {
    minHeight: '56px',
    fontSize: tokens.fontSizeBase400,
    ...shorthands.border('2px', 'dashed', tokens.colorNeutralStroke1),
    backgroundColor: 'transparent',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },

  // Week summary footer
  weekSummary: {
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalM),
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke2),
    position: 'sticky',
    bottom: 0,
  },
  weekSummaryContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weekProgress: {
    flex: 1,
    marginRight: tokens.spacingHorizontalM,
  },
  progressBar: {
    height: '8px',
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.borderRadius('4px'),
    ...shorthands.overflow('hidden'),
    marginTop: tokens.spacingVerticalXS,
  },
  progressFill: {
    height: '100%',
    backgroundColor: tokens.colorBrandBackground,
    ...shorthands.borderRadius('4px'),
    transition: 'width 0.3s ease',
  },
  progressComplete: {
    backgroundColor: tokens.colorPaletteGreenBackground3,
  },
  progressWarning: {
    backgroundColor: '#d83b01',
  },
  weekTotal: {
    textAlign: 'right',
  },
  weekTotalHours: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightBold,
  },

  // Empty state
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.padding(tokens.spacingVerticalXXL),
    textAlign: 'center',
  },
  emptyStateIcon: {
    fontSize: '48px',
    color: tokens.colorNeutralForeground3,
    marginBottom: tokens.spacingVerticalM,
  },
});

interface MobileTimesheetEntryProps {
  weekDates: Date[];
  entries: TimeEntry[];
  projects: Project[];
  weekStart: Date;
  totalHours: number;
  hoursByDate: Record<string, number>;
  onUpdateEntry: (entry: Partial<TimeEntry>) => void;
  onDeleteEntry: (entryId: number) => void;
  onSave: () => void;
  onSubmit: () => void;
  onWithdraw?: () => void;
  onNavigatePreviousWeek: () => void;
  onNavigateNextWeek: () => void;
  onNavigateCurrentWeek: () => void;
  canSubmit: boolean;
  canWithdraw?: boolean;
  isSaving: boolean;
  isSubmitting: boolean;
  isWithdrawing?: boolean;
  disabled?: boolean;
  status?: string;
  submitBlockedReason?: string | null;
}

interface DayEntry {
  projectId: number;
  projectName: string;
  hours: number;
  location: 'Office' | 'WFH' | 'Other';
  notes?: string;
  entryId?: number;
}

export const MobileTimesheetEntry: React.FC<MobileTimesheetEntryProps> = ({
  weekDates,
  entries,
  projects,
  weekStart,
  totalHours,
  hoursByDate,
  onUpdateEntry,
  onDeleteEntry,
  onSave,
  onSubmit,
  onWithdraw,
  onNavigatePreviousWeek,
  onNavigateNextWeek,
  onNavigateCurrentWeek,
  canSubmit,
  canWithdraw,
  isSaving,
  isSubmitting,
  isWithdrawing,
  disabled = false,
  status,
  submitBlockedReason,
}) => {
  const styles = useStyles();

  // Determine initial day - default to today if in current week, else Monday
  const today = formatDate(new Date());
  const todayIndex = weekDates.findIndex(d => formatDate(d) === today);
  const initialDayIndex = todayIndex >= 0 ? todayIndex : 0;

  const [selectedDayIndex, setSelectedDayIndex] = useState(initialDayIndex);
  const selectedDate = weekDates[selectedDayIndex];
  const selectedDateStr = formatDate(selectedDate);

  // Get entries for selected day
  const dayEntries: DayEntry[] = entries
    .filter(e => {
      const entryDate = typeof e.workDate === 'string'
        ? e.workDate.split('T')[0]
        : formatDate(new Date(e.workDate));
      return entryDate === selectedDateStr;
    })
    .map(e => {
      const project = projects.find(p => p.projectId === e.projectId);
      return {
        projectId: e.projectId,
        projectName: project?.projectName || 'Unknown',
        hours: e.hoursWorked,
        location: e.workLocation,
        notes: e.notes,
        entryId: e.timeEntryId,
      };
    });

  const dayTotal = hoursByDate[selectedDateStr] || 0;
  const targetHours = 40;
  const progressPercent = Math.min((totalHours / targetHours) * 100, 100);

  const navigateDay = (direction: number) => {
    const newIndex = selectedDayIndex + direction;
    if (newIndex >= 0 && newIndex < 7) {
      setSelectedDayIndex(newIndex);
    }
  };

  const getDayName = (date: Date): string => {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const getShortDayName = (date: Date): string => {
    return date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
  };

  const getDateDisplay = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isToday = (date: Date): boolean => {
    return formatDate(date) === today;
  };

  const handleHoursChange = (projectId: number, hours: number) => {
    if (disabled) return;

    const existing = entries.find(
      e => e.projectId === projectId &&
           (typeof e.workDate === 'string' ? e.workDate.split('T')[0] : formatDate(new Date(e.workDate))) === selectedDateStr
    );

    if (hours === 0 && existing) {
      onDeleteEntry(existing.timeEntryId);
    } else {
      onUpdateEntry({
        projectId,
        workDate: selectedDateStr,
        hoursWorked: hours,
        workLocation: existing?.workLocation || 'Office',
        notes: existing?.notes,
        ...(existing && { timeEntryId: existing.timeEntryId, timesheetId: existing.timesheetId }),
      });
    }
  };

  const handleLocationChange = (projectId: number, location: 'Office' | 'WFH' | 'Other') => {
    if (disabled) return;

    const existing = entries.find(
      e => e.projectId === projectId &&
           (typeof e.workDate === 'string' ? e.workDate.split('T')[0] : formatDate(new Date(e.workDate))) === selectedDateStr
    );

    if (existing) {
      onUpdateEntry({
        ...existing,
        workLocation: location,
      });
    }
  };

  const handleNotesChange = (projectId: number, notes: string) => {
    if (disabled) return;

    const existing = entries.find(
      e => e.projectId === projectId &&
           (typeof e.workDate === 'string' ? e.workDate.split('T')[0] : formatDate(new Date(e.workDate))) === selectedDateStr
    );

    if (existing) {
      onUpdateEntry({
        ...existing,
        notes,
      });
    }
  };

  const handleAddProject = () => {
    if (disabled) return;

    // Find first active project not already used today
    const usedProjectIds = dayEntries.map(e => e.projectId);
    const availableProject = projects.find(
      p => p.isActive && !usedProjectIds.includes(p.projectId)
    );

    if (availableProject) {
      onUpdateEntry({
        projectId: availableProject.projectId,
        workDate: selectedDateStr,
        hoursWorked: 8, // Default to 8 hours
        workLocation: 'Office',
      });
    }
  };

  const handleDeleteEntry = (entry: DayEntry) => {
    if (disabled || !entry.entryId) return;
    onDeleteEntry(entry.entryId);
  };

  const handleProjectChange = (oldProjectId: number, newProjectId: number) => {
    if (disabled) return;

    const existing = entries.find(
      e => e.projectId === oldProjectId &&
           (typeof e.workDate === 'string' ? e.workDate.split('T')[0] : formatDate(new Date(e.workDate))) === selectedDateStr
    );

    if (existing) {
      onUpdateEntry({
        ...existing,
        projectId: newProjectId,
      });
    }
  };

  const availableProjects = projects.filter(p => p.isActive);
  const canAddMore = dayEntries.length < availableProjects.length;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        {/* Week Navigation */}
        <div className={styles.weekNavigation}>
          <Button
            appearance="subtle"
            icon={<ChevronLeft24Regular />}
            onClick={onNavigatePreviousWeek}
            className={styles.weekNavButton}
          />
          <Button
            appearance="subtle"
            onClick={onNavigateCurrentWeek}
            className={styles.weekNavButton}
          >
            Today
          </Button>
          <Button
            appearance="subtle"
            icon={<ChevronRight24Regular />}
            onClick={onNavigateNextWeek}
            className={styles.weekNavButton}
          />
        </div>

        <div className={styles.headerTop}>
          <div>
            <Body1Strong>
              Week of {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Body1Strong>
            {status && (
              <Badge
                appearance={status === 'Draft' ? 'outline' : 'filled'}
                color={status === 'Approved' ? 'success' : status === 'Submitted' ? 'informative' : 'warning'}
                style={{ marginLeft: tokens.spacingHorizontalS }}
              >
                {status}
              </Badge>
            )}
          </div>
          <div className={styles.headerActions}>
            {canWithdraw && onWithdraw && (
              <Button
                appearance="secondary"
                onClick={onWithdraw}
                disabled={isWithdrawing}
                className={styles.actionButton}
              >
                {isWithdrawing ? '...' : 'Withdraw'}
              </Button>
            )}
            <Button
              appearance="secondary"
              icon={<Save24Regular />}
              onClick={onSave}
              disabled={disabled || isSaving}
              className={styles.actionButton}
            >
              {isSaving ? '...' : 'Save'}
            </Button>
            <Button
              appearance="primary"
              icon={<Send24Regular />}
              onClick={onSubmit}
              disabled={!canSubmit || isSubmitting}
              className={styles.actionButton}
              title={submitBlockedReason || undefined}
            >
              {isSubmitting ? '...' : 'Submit'}
            </Button>
          </div>
        </div>

        {/* Day Navigation */}
        <div className={styles.daySelector}>
          <Button
            appearance="subtle"
            icon={<ChevronLeft24Regular />}
            onClick={() => navigateDay(-1)}
            disabled={selectedDayIndex === 0}
            className={styles.dayNavButton}
          />
          <div className={styles.dayInfo}>
            <span className={`${styles.dayName} ${isToday(selectedDate) ? styles.todayIndicator : ''}`}>
              {getDayName(selectedDate)}
              {isToday(selectedDate) && ' (Today)'}
            </span>
            <span className={styles.dayDate}>{getDateDisplay(selectedDate)}</span>
          </div>
          <Button
            appearance="subtle"
            icon={<ChevronRight24Regular />}
            onClick={() => navigateDay(1)}
            disabled={selectedDayIndex === 6}
            className={styles.dayNavButton}
          />
        </div>

        {/* Week Dots */}
        <div className={styles.weekDots}>
          {weekDates.map((date, index) => {
            const dateStr = formatDate(date);
            const hasHours = (hoursByDate[dateStr] || 0) > 0;
            const isActive = index === selectedDayIndex;
            const isTodayDot = isToday(date);

            return (
              <div
                key={dateStr}
                className={`${styles.dayDot} ${isActive ? styles.dayDotActive : ''} ${isTodayDot && !isActive ? styles.dayDotToday : ''} ${hasHours && !isActive ? styles.dayDotHasHours : ''}`}
                onClick={() => setSelectedDayIndex(index)}
              >
                {getShortDayName(date)}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.content}>
        {/* Day Summary */}
        <div className={styles.daySummary}>
          <div>
            <div className={styles.daySummaryHours}>{dayTotal.toFixed(1)}h</div>
            <div className={styles.daySummaryLabel}>logged today</div>
          </div>
          {dayTotal >= 8 && (
            <Badge appearance="filled" color="success" icon={<Checkmark24Regular />}>
              Complete
            </Badge>
          )}
        </div>

        {/* Entries */}
        <div className={styles.entriesSection}>
          <div className={styles.sectionHeader}>
            <Body1Strong>Time Entries</Body1Strong>
          </div>

          {dayEntries.length === 0 ? (
            <Card className={styles.emptyState}>
              <div className={styles.emptyStateIcon}>📝</div>
              <Text>No hours logged for {getDayName(selectedDate)}</Text>
              <Button
                appearance="primary"
                icon={<Add24Regular />}
                onClick={handleAddProject}
                disabled={disabled}
                style={{ marginTop: tokens.spacingVerticalM }}
              >
                Log Hours
              </Button>
            </Card>
          ) : (
            <>
              {dayEntries.map((entry, index) => {
                const project = projects.find(p => p.projectId === entry.projectId);
                const isPtoOrHoliday = project?.projectType === 'PTO' || project?.projectType === 'Holiday';

                return (
                  <Card key={`${entry.projectId}-${index}`} className={styles.entryCard}>
                    {/* Project selector */}
                    <div className={styles.entryHeader}>
                      <div className={styles.entryProject}>
                        <Dropdown
                          className={styles.projectDropdown}
                          value={`${project?.projectNumber} - ${entry.projectName}`}
                          disabled={disabled}
                          onOptionSelect={(_, data) => {
                            if (data.optionValue) {
                              handleProjectChange(entry.projectId, parseInt(data.optionValue));
                            }
                          }}
                        >
                          {availableProjects.map(p => (
                            <Option key={p.projectId} value={String(p.projectId)} text={`${p.projectNumber} - ${p.projectName}`}>
                              {p.projectNumber} - {p.projectName}
                            </Option>
                          ))}
                        </Dropdown>
                      </div>
                      <Button
                        appearance="subtle"
                        icon={<Delete24Regular />}
                        className={styles.deleteEntryButton}
                        onClick={() => handleDeleteEntry(entry)}
                        disabled={disabled}
                      />
                    </div>

                    {/* Hours with presets */}
                    <div className={styles.hoursSection}>
                      <Caption1 className={styles.hoursLabel}>Hours</Caption1>
                      <div className={styles.hoursInputRow}>
                        <Input
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          value={String(entry.hours)}
                          onChange={(e) => handleHoursChange(entry.projectId, parseFloat(e.target.value) || 0)}
                          disabled={disabled}
                          className={styles.hoursInput}
                        />
                        <div className={styles.presetButtons}>
                          {[4, 6, 8].map(preset => (
                            <Button
                              key={preset}
                              appearance={entry.hours === preset ? 'primary' : 'secondary'}
                              onClick={() => handleHoursChange(entry.projectId, preset)}
                              disabled={disabled}
                              className={styles.presetButton}
                            >
                              {preset}h
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Location toggle - hide for PTO/Holiday */}
                    {!isPtoOrHoliday && entry.hours > 0 && (
                      <div className={styles.locationSection}>
                        <div className={styles.locationLabel}>
                          <Caption1>Location</Caption1>
                        </div>
                        <div className={styles.locationToggle}>
                          <Button
                            appearance={entry.location === 'Office' ? 'primary' : 'secondary'}
                            icon={<Building24Regular />}
                            onClick={() => handleLocationChange(entry.projectId, 'Office')}
                            disabled={disabled}
                            className={styles.locationButton}
                          >
                            Office
                          </Button>
                          <Button
                            appearance={entry.location === 'WFH' ? 'primary' : 'secondary'}
                            icon={<Home24Regular />}
                            onClick={() => handleLocationChange(entry.projectId, 'WFH')}
                            disabled={disabled}
                            className={styles.locationButton}
                          >
                            WFH
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {entry.hours > 0 && (
                      <div className={styles.notesSection}>
                        <Textarea
                          placeholder="Add notes (optional)"
                          value={entry.notes || ''}
                          onChange={(_, data) => handleNotesChange(entry.projectId, data.value)}
                          disabled={disabled}
                          className={styles.notesInput}
                        />
                      </div>
                    )}
                  </Card>
                );
              })}

              {/* Add another project */}
              {canAddMore && !disabled && (
                <Button
                  appearance="outline"
                  icon={<Add24Regular />}
                  onClick={handleAddProject}
                  className={styles.addProjectButton}
                >
                  Add Another Project
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Week Summary Footer */}
      <div className={styles.weekSummary}>
        <div className={styles.weekSummaryContent}>
          <div className={styles.weekProgress}>
            <Caption1>Week Progress</Caption1>
            <div className={styles.progressBar}>
              <div
                className={`${styles.progressFill} ${totalHours >= targetHours ? styles.progressComplete : totalHours < 32 ? styles.progressWarning : ''}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <div className={styles.weekTotal}>
            <div className={styles.weekTotalHours} style={{
              color: totalHours >= targetHours ? '#286f1f' : totalHours >= 32 ? undefined : '#d83b01'
            }}>
              {totalHours.toFixed(1)}h
            </div>
            <Caption1>of {targetHours}h</Caption1>
          </div>
        </div>
      </div>
    </div>
  );
};
