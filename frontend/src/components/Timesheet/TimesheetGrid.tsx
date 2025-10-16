/**
 * Timesheet Grid Component
 * Interactive grid for entering time entries
 */

import { useState } from 'react';
import {
  makeStyles,
  tokens,
  Button,
  Input,
  Dropdown,
  Option,
  Switch,
  Textarea,
  Card,
  Text,
  Caption1,
  Body1Strong,
  shorthands,
} from '@fluentui/react-components';
import {
  Add24Regular,
  Delete24Regular,
} from '@fluentui/react-icons';
import { TimeEntry, Project } from '../../types';
import { formatDate } from '../../services/timesheetService';

const useStyles = makeStyles({
  grid: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalM),
  },
  weekHeader: {
    display: 'grid',
    gridTemplateColumns: '200px repeat(7, 1fr)',
    ...shorthands.gap(tokens.spacingHorizontalS),
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    alignItems: 'center',
  },
  dateCell: {
    textAlign: 'center',
  },
  today: {
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  entryRow: {
    display: 'grid',
    gridTemplateColumns: '200px repeat(7, 1fr)',
    ...shorthands.gap(tokens.spacingHorizontalS),
    alignItems: 'start',
  },
  projectCell: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXS),
  },
  hoursInput: {
    width: '100%',
  },
  dayCell: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXS),
  },
  locationSwitch: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXXS),
  },
  notesInput: {
    minHeight: '60px',
  },
  totalRow: {
    display: 'grid',
    gridTemplateColumns: '200px repeat(7, 1fr)',
    ...shorthands.gap(tokens.spacingHorizontalS),
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalM),
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    alignItems: 'center',
  },
  totalCell: {
    textAlign: 'center',
    fontWeight: tokens.fontWeightSemibold,
  },
  addButton: {
    marginTop: tokens.spacingVerticalM,
  },
  deleteButton: {
    marginTop: tokens.spacingVerticalS,
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
    location: 'Office' | 'WFH';
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

  // Group entries by project
  const gridEntries: GridEntry[] = selectedProjects.map((projectId) => {
    const project = projects.find((p) => p.projectId === projectId);
    const projectEntries = entries.filter((e) => e.projectId === projectId);

    const dailyEntries: GridEntry['dailyEntries'] = {};
    projectEntries.forEach((entry) => {
      dailyEntries[entry.workDate] = {
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

  const handleAddProject = () => {
    // Add the first available project not already selected
    const availableProject = projects.find(
      (p) => p.isActive && !selectedProjects.includes(p.projectId)
    );
    if (availableProject) {
      setSelectedProjects([...selectedProjects, availableProject.projectId]);
    }
  };

  const handleRemoveProject = (projectId: number) => {
    setSelectedProjects(selectedProjects.filter((id) => id !== projectId));
    // Delete all entries for this project
    entries
      .filter((e) => e.projectId === projectId)
      .forEach((e) => onDeleteEntry(e.timeEntryId));
  };

  const handleChangeProject = (oldProjectId: number, newProjectId: number) => {
    setSelectedProjects(
      selectedProjects.map((id) => (id === oldProjectId ? newProjectId : id))
    );
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
      ...(field === 'location' && { workLocation: value as 'Office' | 'WFH' }),
      ...(field === 'notes' && { notes: value as string }),
    };

    if (existing) {
      entry.timeEntryId = existing.timeEntryId;
      entry.timesheetId = existing.timesheetId;
    }

    onUpdateEntry(entry);
  };

  const getDayName = (date: Date): string => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getDateString = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
  };

  return (
    <div className={styles.grid}>
      {/* Week Header */}
      <div className={styles.weekHeader}>
        <Text weight="semibold">Project</Text>
        {weekDates.map((date) => {
          const dateStr = formatDate(date);
          const isToday = dateStr === today;
          return (
            <div key={dateStr} className={styles.dateCell}>
              <Body1Strong className={isToday ? styles.today : undefined}>
                {getDayName(date)}
              </Body1Strong>
              <Caption1 className={isToday ? styles.today : undefined}>
                {getDateString(date)}
              </Caption1>
            </div>
          );
        })}
      </div>

      {/* Entry Rows */}
      {gridEntries.map((gridEntry) => (
        <Card key={gridEntry.projectId}>
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
                  .map((project) => (
                    <Option key={project.projectId} value={String(project.projectId)}>
                      {project.projectName}
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
            {weekDates.map((date) => {
              const dateStr = formatDate(date);
              const dayEntry = gridEntry.dailyEntries[dateStr] || {
                hours: 0,
                location: 'Office' as const,
                notes: '',
              };

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
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      handleUpdateEntry(gridEntry.projectId, dateStr, 'hours', value);
                    }}
                    className={styles.hoursInput}
                  />
                  <div className={styles.locationSwitch}>
                    <Caption1>
                      {dayEntry.location === 'Office' ? 'Office' : 'WFH'}
                    </Caption1>
                    <Switch
                      checked={dayEntry.location === 'WFH'}
                      disabled={disabled || dayEntry.hours === 0}
                      onChange={(_, data) => {
                        handleUpdateEntry(
                          gridEntry.projectId,
                          dateStr,
                          'location',
                          data.checked ? 'WFH' : 'Office'
                        );
                      }}
                    />
                  </div>
                  {dayEntry.hours > 0 && (
                    <Textarea
                      placeholder="Notes..."
                      value={dayEntry.notes || ''}
                      disabled={disabled}
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
        </Card>
      ))}

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

      {/* Totals Row */}
      <div className={styles.totalRow}>
        <Text weight="semibold">Total Hours</Text>
        {weekDates.map((date) => {
          const dateStr = formatDate(date);
          const total = hoursByDate[dateStr] || 0;
          return (
            <div key={dateStr} className={styles.totalCell}>
              <Body1Strong>{total.toFixed(2)}</Body1Strong>
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'right', paddingRight: tokens.spacingHorizontalM }}>
        <Text weight="semibold" size={500}>
          Week Total: {totalHours.toFixed(2)} hours
        </Text>
      </div>
    </div>
  );
};
