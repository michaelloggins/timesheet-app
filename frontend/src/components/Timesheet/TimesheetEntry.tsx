/**
 * Timesheet Entry Page
 * Main page for employees to enter and submit timesheets
 */

import {
  Title2,
  makeStyles,
  tokens,
  Button,
  Spinner,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Card,
  Text,
  Caption1,
  shorthands,
  Badge,
} from '@fluentui/react-components';
import {
  ArrowLeft24Regular,
  ArrowRight24Regular,
  CalendarToday24Regular,
  Save24Regular,
  Send24Regular,
  CheckmarkCircle24Regular,
} from '@fluentui/react-icons';
import { useTimesheet } from '../../hooks/useTimesheet';
import { useProjects } from '../../hooks/useProjects';
import { TimesheetGrid } from './TimesheetGrid';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalL),
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navigation: {
    display: 'flex',
    ...shorthands.gap(tokens.spacingHorizontalM),
    alignItems: 'center',
  },
  weekInfo: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXXS),
    alignItems: 'center',
    minWidth: '200px',
  },
  actions: {
    display: 'flex',
    ...shorthands.gap(tokens.spacingHorizontalS),
  },
  statusCard: {
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalM),
  },
  statusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
  },
});

export const TimesheetEntry = () => {
  const styles = useStyles();
  const {
    timesheet,
    entries,
    weekStart,
    weekDates,
    totalHours,
    hoursByDate,
    isLoading,
    isSaving,
    isSubmitting,
    error,
    navigateToPreviousWeek,
    navigateToNextWeek,
    navigateToCurrentWeek,
    addOrUpdateEntry,
    removeEntry,
    saveDraft,
    submit,
    canSubmit,
  } = useTimesheet();

  const { data: projects = [], isLoading: projectsLoading } = useProjects();

  if (isLoading || projectsLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="large" label="Loading timesheet..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>Error loading timesheet</MessageBarTitle>
            {error.message}
          </MessageBarBody>
        </MessageBar>
      </div>
    );
  }

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const formatWeekRange = (start: Date, end: Date): string => {
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const getStatusBadge = () => {
    if (!timesheet) return null;

    switch (timesheet.status) {
      case 'Draft':
        return <Badge appearance="outline">Draft</Badge>;
      case 'Submitted':
        return <Badge appearance="filled" color="informative">Submitted</Badge>;
      case 'Approved':
        return <Badge appearance="filled" color="success">Approved</Badge>;
      case 'Returned':
        return <Badge appearance="filled" color="warning">Returned</Badge>;
      default:
        return null;
    }
  };

  const isReadOnly = timesheet?.status !== 'Draft' || timesheet?.isLocked;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <Title2>Timesheet Entry</Title2>
        <div className={styles.actions}>
          <Button
            appearance="secondary"
            icon={<Save24Regular />}
            onClick={saveDraft}
            disabled={isReadOnly || isSaving || entries.length === 0}
          >
            {isSaving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button
            appearance="primary"
            icon={<Send24Regular />}
            onClick={submit}
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
          </Button>
        </div>
      </div>

      {/* Week Navigation */}
      <Card className={styles.statusCard}>
        <div className={styles.statusRow}>
          <div className={styles.navigation}>
            <Button
              appearance="subtle"
              icon={<ArrowLeft24Regular />}
              onClick={navigateToPreviousWeek}
            >
              Previous Week
            </Button>
            <Button
              appearance="subtle"
              icon={<CalendarToday24Regular />}
              onClick={navigateToCurrentWeek}
            >
              Current Week
            </Button>
            <Button
              appearance="subtle"
              iconPosition="after"
              icon={<ArrowRight24Regular />}
              onClick={navigateToNextWeek}
            >
              Next Week
            </Button>
          </div>

          <div className={styles.weekInfo}>
            <Text weight="semibold" size={400}>
              {formatWeekRange(weekStart, weekEnd)}
            </Text>
            {getStatusBadge()}
          </div>

          <div style={{ minWidth: '200px', textAlign: 'right' }}>
            <Text>Total Hours: </Text>
            <Text weight="semibold" size={500}>{totalHours.toFixed(2)}</Text>
          </div>
        </div>
      </Card>

      {/* Status Messages */}
      {timesheet?.status === 'Submitted' && (
        <MessageBar intent="info">
          <MessageBarBody>
            <MessageBarTitle>Timesheet Submitted</MessageBarTitle>
            This timesheet was submitted on{' '}
            {new Date(timesheet.submittedDate!).toLocaleDateString()}. Waiting for approval.
          </MessageBarBody>
        </MessageBar>
      )}

      {timesheet?.status === 'Approved' && (
        <MessageBar intent="success" icon={<CheckmarkCircle24Regular />}>
          <MessageBarBody>
            <MessageBarTitle>Timesheet Approved</MessageBarTitle>
            This timesheet was approved on{' '}
            {new Date(timesheet.approvedDate!).toLocaleDateString()}.
          </MessageBarBody>
        </MessageBar>
      )}

      {timesheet?.status === 'Returned' && (
        <MessageBar intent="warning">
          <MessageBarBody>
            <MessageBarTitle>Timesheet Returned</MessageBarTitle>
            {timesheet.returnReason || 'Please review and resubmit.'}
          </MessageBarBody>
        </MessageBar>
      )}

      {isReadOnly && timesheet?.status === 'Draft' && (
        <MessageBar intent="warning">
          <MessageBarBody>
            <MessageBarTitle>Timesheet Locked</MessageBarTitle>
            This timesheet has been locked and cannot be edited.
          </MessageBarBody>
        </MessageBar>
      )}

      {/* Timesheet Grid */}
      <TimesheetGrid
        weekDates={weekDates}
        entries={entries}
        projects={projects}
        hoursByDate={hoursByDate}
        totalHours={totalHours}
        onUpdateEntry={addOrUpdateEntry}
        onDeleteEntry={removeEntry}
        disabled={isReadOnly}
      />

      {/* Helper Text */}
      {!isReadOnly && entries.length === 0 && (
        <Card>
          <div style={{ padding: tokens.spacingVerticalL, textAlign: 'center' }}>
            <Text>
              Click "Add Project" to start entering your time for this week.
            </Text>
            <br />
            <Caption1>
              Enter hours in 0.25 increments (15 minutes). Toggle between Office and Work From Home.
            </Caption1>
          </div>
        </Card>
      )}
    </div>
  );
};
