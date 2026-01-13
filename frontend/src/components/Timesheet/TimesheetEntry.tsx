/**
 * Timesheet Entry Page
 * Main page for employees to enter and submit timesheets
 *
 * Responsive Design:
 * - Desktop (>768px): Full week grid view
 * - Mobile (<=768px): Day-by-day quick entry view
 */

import { useState, useEffect } from 'react';
import {
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
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
} from '@fluentui/react-components';
import {
  ArrowLeft24Regular,
  ArrowRight24Regular,
  ArrowUndo24Regular,
  CalendarToday24Regular,
  Save24Regular,
  Send24Regular,
  CheckmarkCircle24Regular,
  Warning20Regular,
} from '@fluentui/react-icons';
import { useLocation } from 'react-router-dom';
import { useTimesheet } from '../../hooks/useTimesheet';
import { useProjects } from '../../hooks/useProjects';
import { TimesheetGrid } from './TimesheetGrid';
import { MobileTimesheetEntry } from './MobileTimesheetEntry';

// Hook to detect mobile screen
const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= breakpoint : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= breakpoint);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isMobile;
};

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalM),
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    ...shorthands.gap(tokens.spacingHorizontalM),
    '@media (max-width: 768px)': {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
  },
  headerTitle: {
    color: '#286f1f',
    '@media (max-width: 768px)': {
      textAlign: 'center',
    },
  },
  navigation: {
    display: 'flex',
    ...shorthands.gap(tokens.spacingHorizontalXS),
    alignItems: 'center',
  },
  navigationButton: {
    minWidth: 'auto',
  },
  weekInfo: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalM),
    '@media (max-width: 768px)': {
      flexDirection: 'column',
      ...shorthands.gap(tokens.spacingVerticalXS),
    },
  },
  weekDateRange: {
    fontFamily: '"Roboto Condensed", sans-serif',
    fontSize: '18px',
    fontWeight: '600',
    color: '#404041',
  },
  actions: {
    display: 'flex',
    ...shorthands.gap(tokens.spacingHorizontalS),
    '@media (max-width: 480px)': {
      flexDirection: 'column',
      width: '100%',
    },
  },
  actionButton: {
    '@media (max-width: 480px)': {
      width: '100%',
    },
  },
  statusCard: {
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    ...shorthands.borderRadius('12px'),
    backgroundColor: '#f8f9fa',
  },
  statusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalM),
    '@media (max-width: 768px)': {
      flexDirection: 'column',
      ...shorthands.gap(tokens.spacingVerticalS),
    },
  },
  totalHours: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalS),
    ...shorthands.padding(tokens.spacingVerticalXS, tokens.spacingHorizontalM),
    backgroundColor: 'white',
    ...shorthands.borderRadius('8px'),
    ...shorthands.borderWidth('1px'),
    ...shorthands.borderStyle('solid'),
    ...shorthands.borderColor('#e0e0e0'),
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '300px',
  },
  helperCard: {
    ...shorthands.padding(tokens.spacingVerticalM),
    textAlign: 'center',
    color: '#666',
  },
  helperCardContent: {
    ...shorthands.padding(tokens.spacingVerticalM),
  },
});

export const TimesheetEntry = () => {
  const styles = useStyles();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();

  // Get weekStart from navigation state if provided
  const initialWeekStart = (location.state as { weekStart?: string })?.weekStart;

  // Low hours warning dialog state
  const [lowHoursDialogOpen, setLowHoursDialogOpen] = useState(false);

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
    isWithdrawing,
    error,
    navigateToPreviousWeek,
    navigateToNextWeek,
    navigateToCurrentWeek,
    addOrUpdateEntry,
    removeEntry,
    saveDraft,
    submit,
    withdraw,
    canSubmit,
    canWithdraw,
    submitBlockedReason,
  } = useTimesheet({ projects, initialWeekStart });

  // Handle submit button click - check for low hours warning
  const handleSubmitClick = () => {
    if (totalHours < 40) {
      setLowHoursDialogOpen(true);
    } else {
      submit();
    }
  };

  // Confirm submit with low hours
  const handleConfirmLowHoursSubmit = () => {
    setLowHoursDialogOpen(false);
    submit();
  };

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

  const isReadOnly = timesheet?.status !== 'Draft' || timesheet?.isLocked;

  // Mobile view - completely different UX optimized for quick entry
  if (isMobile) {
    return (
      <>
        <MobileTimesheetEntry
          weekDates={weekDates}
          entries={entries}
          projects={projects}
          weekStart={weekStart}
          totalHours={totalHours}
          hoursByDate={hoursByDate}
          onUpdateEntry={addOrUpdateEntry}
          onDeleteEntry={removeEntry}
          onSave={saveDraft}
          onSubmit={handleSubmitClick}
          onWithdraw={withdraw}
          onNavigatePreviousWeek={navigateToPreviousWeek}
          onNavigateNextWeek={navigateToNextWeek}
          onNavigateCurrentWeek={navigateToCurrentWeek}
          canSubmit={canSubmit}
          canWithdraw={canWithdraw}
          isSaving={isSaving}
          isSubmitting={isSubmitting}
          isWithdrawing={isWithdrawing}
          disabled={isReadOnly}
          status={timesheet?.status}
          submitBlockedReason={submitBlockedReason}
        />
        {/* Low Hours Warning Dialog for Mobile */}
        <Dialog open={lowHoursDialogOpen} onOpenChange={(_, data) => setLowHoursDialogOpen(data.open)}>
          <DialogSurface>
            <DialogBody>
              <DialogTitle>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Warning20Regular style={{ color: '#d83b01' }} />
                  <span>Missing Hours Warning</span>
                </div>
              </DialogTitle>
              <DialogContent>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <Text>
                    You are submitting a timesheet with <strong>{totalHours.toFixed(1)} hours</strong>,
                    which is less than the expected <strong>40 hours</strong> for the week.
                  </Text>
                  <Text>
                    There are <strong>{(40 - totalHours).toFixed(1)} hours</strong> expected but not reported.
                  </Text>
                  <Text size={200} style={{ color: '#666' }}>
                    Are you sure you want to submit this timesheet?
                  </Text>
                </div>
              </DialogContent>
              <DialogActions>
                <Button
                  appearance="secondary"
                  onClick={() => setLowHoursDialogOpen(false)}
                >
                  Go Back to Timesheet
                </Button>
                <Button
                  appearance="primary"
                  icon={<Send24Regular />}
                  onClick={handleConfirmLowHoursSubmit}
                >
                  Submit Anyway
                </Button>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>
      </>
    );
  }

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

  return (
    <div className={styles.container}>
      {/* Header with Navigation and Actions */}
      <div className={styles.header}>
        <div className={styles.navigation}>
          <Button
            className={styles.navigationButton}
            appearance="subtle"
            icon={<ArrowLeft24Regular />}
            onClick={navigateToPreviousWeek}
            title="Previous Week"
            size="small"
          />
          <Button
            className={styles.navigationButton}
            appearance="subtle"
            icon={<CalendarToday24Regular />}
            onClick={navigateToCurrentWeek}
            title="Current Week"
            size="small"
          />
          <Button
            className={styles.navigationButton}
            appearance="subtle"
            icon={<ArrowRight24Regular />}
            onClick={navigateToNextWeek}
            title="Next Week"
            size="small"
          />
        </div>

        <div className={styles.weekInfo}>
          <span className={styles.weekDateRange}>
            {formatWeekRange(weekStart, weekEnd)}
          </span>
          {getStatusBadge()}
        </div>

        <div className={styles.actions}>
          {canWithdraw && (
            <Button
              className={styles.actionButton}
              appearance="secondary"
              icon={<ArrowUndo24Regular />}
              onClick={withdraw}
              disabled={isWithdrawing}
              size="small"
            >
              {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
            </Button>
          )}
          <Button
            className={styles.actionButton}
            appearance="secondary"
            icon={<Save24Regular />}
            onClick={saveDraft}
            disabled={isReadOnly || isSaving || entries.length === 0}
            size="small"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          <Button
            className={styles.actionButton}
            appearance="primary"
            icon={<Send24Regular />}
            onClick={handleSubmitClick}
            disabled={!canSubmit || isSubmitting}
            title={submitBlockedReason || undefined}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </div>

      {/* Status Bar with Total Hours */}
      <Card className={styles.statusCard}>
        <div className={styles.statusRow}>
          <div className={styles.totalHours}>
            <Text size={200}>Total:</Text>
            <Text weight="bold" size={400} style={{
              color: totalHours >= 40 ? '#286f1f' : totalHours >= 32 ? '#404041' : '#d83b01',
              fontFamily: '"Roboto Condensed", sans-serif',
            }}>
              {totalHours.toFixed(1)}h
            </Text>
            <Text size={200} style={{ color: '#666' }}>/ 40h</Text>
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

      {submitBlockedReason && timesheet?.status === 'Draft' && (
        <MessageBar intent="info">
          <MessageBarBody>
            {submitBlockedReason}
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
        <Card className={styles.helperCard}>
          <div className={styles.helperCardContent}>
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

      {/* Low Hours Warning Dialog */}
      <Dialog open={lowHoursDialogOpen} onOpenChange={(_, data) => setLowHoursDialogOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Warning20Regular style={{ color: '#d83b01' }} />
                <span>Missing Hours Warning</span>
              </div>
            </DialogTitle>
            <DialogContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Text>
                  You are submitting a timesheet with <strong>{totalHours.toFixed(1)} hours</strong>,
                  which is less than the expected <strong>40 hours</strong> for the week.
                </Text>
                <Text>
                  There are <strong>{(40 - totalHours).toFixed(1)} hours</strong> expected but not reported.
                </Text>
                <Text size={200} style={{ color: '#666' }}>
                  Are you sure you want to submit this timesheet?
                </Text>
              </div>
            </DialogContent>
            <DialogActions>
              <Button
                appearance="secondary"
                onClick={() => setLowHoursDialogOpen(false)}
              >
                Go Back to Timesheet
              </Button>
              <Button
                appearance="primary"
                icon={<Send24Regular />}
                onClick={handleConfirmLowHoursSubmit}
              >
                Submit Anyway
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};
