/**
 * Timesheet List Component
 * Shows all timesheets for the current user with filtering
 */

import { useState } from 'react';
import {
  Title2,
  Button,
  makeStyles,
  tokens,
  Card,
  Text,
  Badge,
  Spinner,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Dropdown,
  Option,
  shorthands,
  Body1Strong,
  Caption1,
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
} from '@fluentui/react-components';
import {
  Add24Regular,
  Calendar24Regular,
  Clock24Regular,
  CheckmarkCircle24Regular,
  ArrowUndo24Regular,
  Edit24Regular,
  Delete24Regular,
} from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyTimesheets, deleteTimesheet } from '../../services/timesheetService';
import { Timesheet } from '../../types';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalL),
    // Mobile: reduce gap
    '@media (max-width: 480px)': {
      ...shorthands.gap(tokens.spacingVerticalM),
    },
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    // Tablet: adjust spacing
    '@media (max-width: 768px)': {
      flexWrap: 'wrap',
      ...shorthands.gap(tokens.spacingVerticalS),
    },
    // Mobile: stack vertically
    '@media (max-width: 480px)': {
      flexDirection: 'column',
      alignItems: 'stretch',
      ...shorthands.gap(tokens.spacingVerticalM),
    },
  },
  filters: {
    display: 'flex',
    ...shorthands.gap(tokens.spacingHorizontalM),
    alignItems: 'center',
    flexWrap: 'wrap',
    // Tablet: wrap filter items
    '@media (max-width: 768px)': {
      ...shorthands.gap(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    },
    // Mobile: stack vertically, full width
    '@media (max-width: 480px)': {
      flexDirection: 'column',
      alignItems: 'stretch',
      ...shorthands.gap(tokens.spacingVerticalS),
    },
  },
  filterDropdown: {
    minWidth: '250px',
    // Mobile: full width dropdown
    '@media (max-width: 480px)': {
      minWidth: 'unset',
      width: '100%',
    },
  },
  filterActions: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalM),
    // Mobile: full width, space between
    '@media (max-width: 480px)': {
      width: '100%',
      justifyContent: 'space-between',
    },
  },
  timesheetCard: {
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    // Touch-friendly: minimum height for tap targets
    minHeight: '72px',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: tokens.shadow8,
    },
    // Mobile: disable hover transform for touch devices
    '@media (max-width: 480px)': {
      ':hover': {
        transform: 'none',
      },
      ':active': {
        backgroundColor: tokens.colorNeutralBackground1Pressed,
      },
    },
  },
  timesheetCardReturned: {
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    backgroundColor: tokens.colorPaletteRedBackground1,
    minHeight: '72px',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: tokens.shadow8,
    },
    '@media (max-width: 480px)': {
      ':hover': {
        transform: 'none',
      },
      ':active': {
        backgroundColor: tokens.colorPaletteRedBackground2,
      },
    },
  },
  timesheetCardApproved: {
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    backgroundColor: tokens.colorPaletteGreenBackground1,
    minHeight: '72px',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: tokens.shadow8,
    },
    '@media (max-width: 480px)': {
      ':hover': {
        transform: 'none',
      },
      ':active': {
        backgroundColor: tokens.colorPaletteGreenBackground2,
      },
    },
  },
  cardContent: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    ...shorthands.gap(tokens.spacingHorizontalM),
    alignItems: 'center',
    // Tablet: maintain grid but adjust gap
    '@media (max-width: 768px)': {
      ...shorthands.gap(tokens.spacingHorizontalS),
    },
    // Mobile: stack vertically (single column)
    '@media (max-width: 480px)': {
      gridTemplateColumns: '1fr',
      ...shorthands.gap(tokens.spacingVerticalM),
    },
  },
  timesheetInfo: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXS),
    // Mobile: increase spacing for readability
    '@media (max-width: 480px)': {
      ...shorthands.gap(tokens.spacingVerticalS),
    },
  },
  timesheetMeta: {
    display: 'flex',
    ...shorthands.gap(tokens.spacingHorizontalM),
    alignItems: 'center',
    flexWrap: 'wrap',
    // Tablet: wrap meta items
    '@media (max-width: 768px)': {
      ...shorthands.gap(tokens.spacingVerticalXS, tokens.spacingHorizontalS),
    },
    // Mobile: stack meta vertically
    '@media (max-width: 480px)': {
      flexDirection: 'column',
      alignItems: 'flex-start',
      ...shorthands.gap(tokens.spacingVerticalXS),
    },
  },
  statusBadge: {
    display: 'flex',
    ...shorthands.gap(tokens.spacingHorizontalS),
    alignItems: 'center',
  },
  cardActions: {
    display: 'flex',
    ...shorthands.gap(tokens.spacingHorizontalS),
    alignItems: 'center',
    '@media (max-width: 480px)': {
      width: '100%',
      ...shorthands.gap(tokens.spacingHorizontalXS),
    },
  },
  cardActionButton: {
    // Touch-friendly: minimum tap target size (44x44px recommended)
    minWidth: '44px',
    minHeight: '44px',
    // Mobile: full width button
    '@media (max-width: 480px)': {
      flex: 1,
      justifyContent: 'center',
    },
  },
  deleteButton: {
    minWidth: '44px',
    minHeight: '44px',
    color: tokens.colorPaletteRedForeground1,
    '@media (max-width: 480px)': {
      flex: 'none',
      width: '44px',
    },
  },
  dialogSurface: {
    maxWidth: '400px',
    '@media (max-width: 480px)': {
      maxWidth: '100%',
      width: '100%',
      ...shorthands.margin(tokens.spacingVerticalM),
    },
  },
  dialogActions: {
    '@media (max-width: 480px)': {
      flexDirection: 'column',
      ...shorthands.gap(tokens.spacingVerticalS),
      '& button': {
        width: '100%',
      },
    },
  },
  emptyState: {
    textAlign: 'center',
    ...shorthands.padding(tokens.spacingVerticalXXXL),
    // Mobile: reduce padding
    '@media (max-width: 480px)': {
      ...shorthands.padding(tokens.spacingVerticalXL, tokens.spacingHorizontalM),
    },
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '300px',
    // Mobile: reduce minimum height
    '@media (max-width: 480px)': {
      minHeight: '200px',
    },
  },
  monthGroup: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalM),
    // Mobile: reduce gap between cards
    '@media (max-width: 480px)': {
      ...shorthands.gap(tokens.spacingVerticalS),
    },
  },
  monthHeader: {
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    // Mobile: sticky header for better navigation
    '@media (max-width: 480px)': {
      position: 'sticky',
      top: 0,
      zIndex: 1,
      ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalM),
    },
  },
  // New button class for header button with touch-friendly sizing
  headerButton: {
    minHeight: '44px',
    // Mobile: full width
    '@media (max-width: 480px)': {
      width: '100%',
    },
  },
});

type TimesheetStatus = 'Draft' | 'Submitted' | 'Approved' | 'Returned';
const ALL_STATUSES: TimesheetStatus[] = ['Draft', 'Submitted', 'Approved', 'Returned'];

export const TimesheetList = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Default to Draft and Submitted
  const [selectedStatuses, setSelectedStatuses] = useState<TimesheetStatus[]>(['Draft', 'Submitted', 'Returned']);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [timesheetToDelete, setTimesheetToDelete] = useState<Timesheet | null>(null);

  const {
    data: timesheets = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['timesheets'],
    queryFn: getMyTimesheets,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (timesheetId: number) => deleteTimesheet(timesheetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
      setDeleteDialogOpen(false);
      setTimesheetToDelete(null);
    },
  });

  const handleDeleteClick = (e: React.MouseEvent, timesheet: Timesheet) => {
    e.stopPropagation(); // Prevent card click
    setTimesheetToDelete(timesheet);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (timesheetToDelete) {
      deleteMutation.mutate(timesheetToDelete.timesheetId);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="large" label="Loading timesheets..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>Error loading timesheets</MessageBarTitle>
            {(error as Error).message}
          </MessageBarBody>
        </MessageBar>
      </div>
    );
  }

  // Ensure timesheets is an array before filtering
  const timesheetArray = Array.isArray(timesheets) ? timesheets : [];

  // Filter timesheets by selected statuses
  const filteredTimesheets = timesheetArray.filter((ts) =>
    selectedStatuses.length === 0 || selectedStatuses.includes(ts.status as TimesheetStatus)
  );

  // Group timesheets by month
  const groupedByMonth = filteredTimesheets.reduce((acc, ts) => {
    const date = new Date(ts.periodStartDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

    if (!acc[monthKey]) {
      acc[monthKey] = {
        label: monthLabel,
        timesheets: [],
      };
    }
    acc[monthKey].timesheets.push(ts);
    return acc;
  }, {} as Record<string, { label: string; timesheets: Timesheet[] }>);

  const sortedMonths = Object.keys(groupedByMonth).sort().reverse();

  const getStatusBadge = (status: Timesheet['status']) => {
    switch (status) {
      case 'Draft':
        return (
          <Badge appearance="outline" icon={<Edit24Regular />}>
            Draft
          </Badge>
        );
      case 'Submitted':
        return (
          <Badge appearance="filled" color="informative" icon={<Clock24Regular />}>
            Submitted
          </Badge>
        );
      case 'Approved':
        return (
          <Badge appearance="filled" color="success" icon={<CheckmarkCircle24Regular />}>
            Approved
          </Badge>
        );
      case 'Returned':
        return (
          <Badge appearance="filled" color="warning" icon={<ArrowUndo24Regular />}>
            Returned
          </Badge>
        );
    }
  };

  const formatWeekRange = (start: string, end: string): string => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const getTotalHours = (ts: Timesheet): number => {
    return ts.entries.reduce((sum, entry) => sum + entry.hoursWorked, 0);
  };

  const handleTimesheetClick = (ts: Timesheet) => {
    // Navigate to entry page with the week
    navigate('/timesheets/entry', { state: { weekStart: ts.periodStartDate } });
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <Title2>My Timesheets</Title2>
        <Button
          appearance="primary"
          icon={<Add24Regular />}
          onClick={() => navigate('/timesheets/entry')}
          className={styles.headerButton}
        >
          New Timesheet
        </Button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <Text weight="semibold">Filter by status:</Text>
        <Dropdown
          placeholder="Select statuses"
          multiselect
          selectedOptions={selectedStatuses}
          value={selectedStatuses.length === ALL_STATUSES.length ? 'All Statuses' : selectedStatuses.join(', ')}
          onOptionSelect={(_, data) => {
            const value = data.optionValue as TimesheetStatus;
            setSelectedStatuses((prev) =>
              data.selectedOptions.includes(value)
                ? [...prev.filter((s) => s !== value), value]
                : prev.filter((s) => s !== value)
            );
          }}
          className={styles.filterDropdown}
        >
          {ALL_STATUSES.map((status) => (
            <Option key={status} value={status}>
              {status}
            </Option>
          ))}
        </Dropdown>
        <div className={styles.filterActions}>
          <Button
            appearance="subtle"
            size="small"
            onClick={() => setSelectedStatuses(['Draft', 'Submitted', 'Returned'])}
          >
            Reset
          </Button>
          <Caption1>
            Showing {filteredTimesheets.length} of {timesheetArray.length} timesheets
          </Caption1>
        </div>
      </div>

      {/* Empty State */}
      {filteredTimesheets.length === 0 && (
        <Card className={styles.emptyState}>
          <Calendar24Regular style={{ fontSize: '48px', color: tokens.colorNeutralForeground3 }} />
          <Title2>No timesheets found</Title2>
          <Text>
            {selectedStatuses.length === ALL_STATUSES.length
              ? "You haven't created any timesheets yet."
              : `No timesheets with status: ${selectedStatuses.join(', ')}.`}
          </Text>
          <Button
            appearance="primary"
            icon={<Add24Regular />}
            onClick={() => navigate('/timesheets/entry')}
            style={{ marginTop: tokens.spacingVerticalM }}
          >
            Create Your First Timesheet
          </Button>
        </Card>
      )}

      {/* Grouped Timesheets by Month */}
      {sortedMonths.map((monthKey) => {
        const { label, timesheets: monthTimesheets } = groupedByMonth[monthKey];

        return (
          <div key={monthKey} className={styles.monthGroup}>
            <div className={styles.monthHeader}>
              <Body1Strong>{label}</Body1Strong>
            </div>

            {monthTimesheets
              .sort((a, b) => new Date(b.periodStartDate).getTime() - new Date(a.periodStartDate).getTime())
              .map((timesheet) => {
                // Get appropriate card style based on status
                const cardClass =
                  timesheet.status === 'Returned'
                    ? styles.timesheetCardReturned
                    : timesheet.status === 'Approved'
                    ? styles.timesheetCardApproved
                    : styles.timesheetCard;

                return (
                  <Card
                    key={timesheet.timesheetId}
                    className={cardClass}
                    onClick={() => handleTimesheetClick(timesheet)}
                  >
                    <div className={styles.cardContent}>
                      <div className={styles.timesheetInfo}>
                        <Body1Strong>
                          Week of {formatWeekRange(timesheet.periodStartDate, timesheet.periodEndDate)}
                        </Body1Strong>
                        <div className={styles.timesheetMeta}>
                          <div className={styles.statusBadge}>{getStatusBadge(timesheet.status)}</div>
                          <Text>
                            <Clock24Regular style={{ fontSize: '16px', marginRight: '4px' }} />
                            {getTotalHours(timesheet).toFixed(2)} hours
                          </Text>
                          {timesheet.submittedDate && (
                            <Caption1>
                              Submitted: {new Date(timesheet.submittedDate).toLocaleDateString()}
                            </Caption1>
                          )}
                          {timesheet.approvedDate && (
                            <Caption1>
                              Approved: {new Date(timesheet.approvedDate).toLocaleDateString()}
                            </Caption1>
                          )}
                        </div>
                        {timesheet.returnReason && (
                          <Caption1 style={{ color: tokens.colorPaletteRedForeground1 }}>
                            Return reason: {timesheet.returnReason}
                          </Caption1>
                        )}
                      </div>
                      <div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
                        <Button
                          appearance="subtle"
                          icon={<Edit24Regular />}
                          className={styles.cardActionButton}
                          onClick={() => handleTimesheetClick(timesheet)}
                        >
                          {timesheet.status === 'Draft' || timesheet.status === 'Returned' ? 'Edit' : 'View'}
                        </Button>
                        {timesheet.status === 'Draft' && (
                          <Button
                            appearance="subtle"
                            icon={<Delete24Regular />}
                            className={styles.deleteButton}
                            onClick={(e) => handleDeleteClick(e, timesheet)}
                            title="Delete timesheet"
                          />
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
          </div>
        );
      })}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(_, data) => setDeleteDialogOpen(data.open)}>
        <DialogSurface className={styles.dialogSurface}>
          <DialogTitle>Delete Timesheet?</DialogTitle>
          <DialogBody>
            <DialogContent>
              <Text>
                Are you sure you want to delete the timesheet for{' '}
                <strong>
                  {timesheetToDelete
                    ? formatWeekRange(timesheetToDelete.periodStartDate, timesheetToDelete.periodEndDate)
                    : ''}
                </strong>
                ?
              </Text>
              <br />
              <Text style={{ color: tokens.colorPaletteRedForeground1 }}>
                This will permanently delete the timesheet and all its entries. This action cannot be undone.
              </Text>
            </DialogContent>
            <DialogActions className={styles.dialogActions}>
              <Button
                appearance="primary"
                style={{ backgroundColor: tokens.colorPaletteRedBackground3 }}
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
              <Button appearance="secondary" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};
