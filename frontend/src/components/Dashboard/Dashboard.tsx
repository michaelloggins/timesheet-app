/**
 * Dashboard Component
 * Main dashboard with editable current week timecard, KPIs, and leaderboard
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Title2,
  Card,
  makeStyles,
  tokens,
  shorthands,
  Text,
  Body1Strong,
  Caption1,
  Button,
  Badge,
  ProgressBar,
  Spinner,
  Divider,
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Dropdown,
  Option,
  Input,
} from '@fluentui/react-components';
import {
  DocumentBulletList24Regular,
  ArrowRight24Regular,
  Trophy24Regular,
  ChartMultiple24Regular,
  People24Regular,
  CheckmarkCircle24Regular,
  Clock24Regular,
  Fire20Regular,
  Send24Regular,
  Checkmark20Regular,
  ArrowSync20Regular,
  Warning20Regular,
  Add24Regular,
} from '@fluentui/react-icons';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useEmployeeStats, useManagerStats, useLeaderboard } from '../../hooks/useDashboard';
import { useTimesheet } from '../../hooks/useTimesheet';
import { useProjects } from '../../hooks/useProjects';
import { getStreakBadge, getComplianceColor } from '../../services/dashboardService';
import { formatDate } from '../../services/timesheetService';

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
    flexWrap: 'wrap',
    ...shorthands.gap(tokens.spacingVerticalM),
  },
  greeting: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXXS),
  },

  // Current week timecard section
  timecardSection: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalM),
  },
  timecardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timecardCard: {
    ...shorthands.padding('24px'),
    ...shorthands.borderRadius('16px'),
    boxShadow: '0 4px 20px rgba(40, 111, 31, 0.08)',
    '@media (max-width: 480px)': {
      ...shorthands.padding(tokens.spacingVerticalM),
    },
  },
  weekDays: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    ...shorthands.gap('12px'),
    '@media (max-width: 768px)': {
      gridTemplateColumns: 'repeat(7, 1fr)',
      ...shorthands.gap('6px'),
    },
  },
  dayColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingVerticalXS),
    ...shorthands.padding('16px', '8px'),
    ...shorthands.borderRadius('12px'),
    backgroundColor: '#f8f9fa',
    ...shorthands.borderWidth('2px'),
    ...shorthands.borderStyle('solid'),
    ...shorthands.borderColor('transparent'),
    cursor: 'pointer',
    transitionProperty: 'all',
    transitionDuration: '200ms',
    ':hover': {
      backgroundColor: '#e8f5e3',
      ...shorthands.borderColor('#85b43b'),
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(40, 111, 31, 0.15)',
    },
  },
  dayColumnToday: {
    background: 'linear-gradient(135deg, #e8f5e3 0%, #d4eec9 100%)',
    ...shorthands.borderColor('#286f1f'),
  },
  dayColumnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    ':hover': {
      transform: 'none',
      boxShadow: 'none',
    },
  },
  dayName: {
    fontSize: tokens.fontSizeBase200,
    color: '#666',
    fontWeight: tokens.fontWeightSemibold,
    textTransform: 'uppercase',
    '@media (max-width: 480px)': {
      fontSize: '10px',
    },
  },
  dayDate: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightBold,
    color: '#404041',
  },
  dayHours: {
    fontSize: '24px',
    fontWeight: tokens.fontWeightBold,
    color: '#286f1f',
    fontFamily: '"Roboto Condensed", sans-serif',
  },
  dayAddHint: {
    fontSize: tokens.fontSizeBase100,
    color: '#999',
  },
  // Quick entry row
  quickEntryRow: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalM),
    marginTop: tokens.spacingVerticalM,
    ...shorthands.padding(tokens.spacingVerticalM),
    backgroundColor: '#f8f9fa',
    ...shorthands.borderRadius('12px'),
    flexWrap: 'wrap',
    '@media (max-width: 768px)': {
      flexDirection: 'column',
      alignItems: 'stretch',
      ...shorthands.gap(tokens.spacingVerticalS),
    },
  },
  quickEntryLabel: {
    fontWeight: tokens.fontWeightSemibold,
    color: '#286f1f',
    minWidth: '80px',
    '@media (max-width: 768px)': {
      marginBottom: tokens.spacingVerticalXS,
    },
  },
  quickEntryDropdown: {
    minWidth: '200px',
    flex: 1,
    '@media (max-width: 768px)': {
      minWidth: 'unset',
      width: '100%',
    },
  },
  quickEntryHours: {
    width: '100px',
    '@media (max-width: 768px)': {
      width: '100%',
    },
  },
  quickEntryDaySelect: {
    minWidth: '120px',
    '@media (max-width: 768px)': {
      width: '100%',
    },
  },
  quickEntryButton: {
    '@media (max-width: 768px)': {
      width: '100%',
    },
  },
  totalHoursRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: tokens.spacingVerticalM,
  },
  totalHours: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalM),
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },
  progressSection: {
    marginTop: tokens.spacingVerticalS,
  },
  saveStatus: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalXS),
    fontSize: tokens.fontSizeBase200,
  },
  saveStatusSaving: {
    color: tokens.colorNeutralForeground3,
  },
  saveStatusSaved: {
    color: tokens.colorPaletteGreenForeground1,
  },
  saveStatusError: {
    color: tokens.colorPaletteRedForeground1,
  },

  // Action buttons
  actionButtons: {
    display: 'flex',
    ...shorthands.gap(tokens.spacingHorizontalS),
  },

  // KPI Grid - Gamified Style
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    ...shorthands.gap(tokens.spacingHorizontalL),
    '@media (max-width: 480px)': {
      gridTemplateColumns: '1fr',
    },
  },
  kpiCard: {
    ...shorthands.padding('24px'),
    cursor: 'pointer',
    ...shorthands.borderRadius('16px'),
    background: 'linear-gradient(135deg, #ffffff 0%, #f8faf5 100%)',
    boxShadow: '0 4px 20px rgba(40, 111, 31, 0.1)',
    ...shorthands.borderWidth('2px'),
    ...shorthands.borderStyle('solid'),
    ...shorthands.borderColor('transparent'),
    transitionProperty: 'all',
    transitionDuration: '200ms',
    ':hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 8px 30px rgba(40, 111, 31, 0.15)',
      ...shorthands.borderColor('#85b43b'),
    },
  },
  kpiHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: tokens.spacingVerticalM,
  },
  kpiIcon: {
    width: '48px',
    height: '48px',
    ...shorthands.borderRadius('12px'),
    backgroundColor: '#e8f5e3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#286f1f',
    fontSize: '24px',
  },
  kpiValue: {
    fontSize: '48px',
    fontWeight: tokens.fontWeightBold,
    lineHeight: 1,
    fontFamily: '"Roboto Condensed", sans-serif',
  },
  kpiLabel: {
    fontSize: tokens.fontSizeBase400,
    color: '#404041',
    fontWeight: tokens.fontWeightSemibold,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  kpiSubtext: {
    fontSize: tokens.fontSizeBase300,
    color: '#666',
  },
  kpiProgress: {
    marginTop: tokens.spacingVerticalM,
  },

  // Department/Team section
  teamSection: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalM),
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalS),
  },

  // Leaderboard - Gamified Style
  leaderboardCard: {
    ...shorthands.padding('24px'),
    ...shorthands.borderRadius('16px'),
    boxShadow: '0 4px 20px rgba(40, 111, 31, 0.08)',
  },
  leaderboardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacingVerticalL,
    paddingBottom: tokens.spacingVerticalM,
    ...shorthands.borderBottom('2px', 'solid', '#e8f5e3'),
  },
  leaderboardList: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalS),
  },
  leaderboardItem: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalM),
    ...shorthands.padding('12px', '16px'),
    ...shorthands.borderRadius('12px'),
    backgroundColor: '#f8f9fa',
    ...shorthands.borderWidth('2px'),
    ...shorthands.borderStyle('solid'),
    ...shorthands.borderColor('transparent'),
    transitionProperty: 'all',
    transitionDuration: '150ms',
    ':hover': {
      backgroundColor: '#e8f5e3',
      ...shorthands.borderColor('#85b43b'),
    },
  },
  leaderboardItemTop3: {
    background: 'linear-gradient(135deg, #fff9e6 0%, #fff3cd 100%)',
    ...shorthands.borderColor('#ffc107'),
  },
  rankBadge: {
    minWidth: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.borderRadius('50%'),
    fontSize: '20px',
    fontWeight: tokens.fontWeightBold,
    // Note: backgroundColor is applied via inline styles for rank-specific colors
  },
  employeeInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  scoreSection: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalM),
  },
  scoreValue: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase400,
  },
  streakBadge: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalXS),
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorPaletteRedForeground1,
  },

  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '200px',
  },
});

export const Dashboard = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const { user, isManager } = useCurrentUser();
  const { data: projects = [] } = useProjects();

  // Quick entry state (inline, not dialog)
  const [quickEntryProject, setQuickEntryProject] = useState<string>('');
  const [quickEntryHours, setQuickEntryHours] = useState<string>('8');
  const [quickEntryDay, setQuickEntryDay] = useState<string>('');

  // Low hours warning dialog state
  const [lowHoursDialogOpen, setLowHoursDialogOpen] = useState(false);

  // Get timesheet data for current week with auto-save enabled
  // Use lazyCreate to avoid creating timesheet until user adds an entry
  const {
    weekDates,
    totalHours,
    hoursByDate,
    timesheet,
    saveStatus,
    hasUnsavedChanges,
    addOrUpdateEntry,
    submit,
    isSubmitting,
    canSubmit,
    submitBlockedReason,
  } = useTimesheet({ projects, autoSave: true, lazyCreate: true });

  // Get KPIs based on user role
  const employeeStats = useEmployeeStats();
  const managerStats = useManagerStats();
  const { leaderboard: companyLeaderboard, isLoading: leaderboardLoading } = useLeaderboard(5);

  const personalKPIs = isManager ? managerStats.personalKPIs : employeeStats.personalKPIs;
  const teamKPIs = isManager ? managerStats.teamKPIs : null;
  // Show leaderboard for all users - managers see their team, others see company leaderboard
  const leaderboard = isManager ? managerStats.leaderboard : companyLeaderboard;

  const isLoading = employeeStats.isLoading || leaderboardLoading || (isManager && managerStats.isLoading);
  const isReadOnly = timesheet?.status !== 'Draft' || timesheet?.isLocked;

  // Get active projects for dropdown
  const activeProjects = projects.filter(p => p.isActive);

  // Initialize quick entry day to today (or first day of week)
  const getTodayDateStr = () => {
    const today = new Date();
    const todayStr = formatDate(today);
    // Check if today is in the current week
    const weekDateStrs = weekDates.map(d => formatDate(d));
    if (weekDateStrs.includes(todayStr)) {
      return todayStr;
    }
    return weekDateStrs[0] || '';
  };

  // Set default day when weekDates load
  if (!quickEntryDay && weekDates.length > 0) {
    setQuickEntryDay(getTodayDateStr());
  }

  // Set default project when projects load
  if (!quickEntryProject && activeProjects.length > 0) {
    const standardWork = activeProjects.find(p => p.projectNumber === 'WRK-001' || p.projectName === 'Standard Work');
    setQuickEntryProject((standardWork || activeProjects[0])?.projectId.toString() || '');
  }

  // Format date for display
  const formatDayName = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const formatDayDate = (date: Date) => {
    return date.getDate().toString();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getHoursForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return hoursByDate[dateStr] || 0;
  };

  // Handle inline quick entry
  const handleQuickEntry = () => {
    if (!quickEntryDay || !quickEntryProject) return;

    const hours = parseFloat(quickEntryHours);
    if (isNaN(hours) || hours <= 0) return;

    addOrUpdateEntry({
      projectId: parseInt(quickEntryProject),
      workDate: quickEntryDay,
      hoursWorked: hours,
      workLocation: 'Office',
    });

    // Reset hours for next entry
    setQuickEntryHours('8');
  };

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

  // Navigate to timesheet list with filter
  const handleKPIClick = (filter: 'approved' | 'pending' | 'all') => {
    navigate('/timesheets', { state: { filter } });
  };

  // Render save status indicator
  const renderSaveStatus = () => {
    if (saveStatus === 'saving') {
      return (
        <div className={`${styles.saveStatus} ${styles.saveStatusSaving}`}>
          <ArrowSync20Regular />
          <span>Saving...</span>
        </div>
      );
    }
    if (saveStatus === 'saved') {
      return (
        <div className={`${styles.saveStatus} ${styles.saveStatusSaved}`}>
          <Checkmark20Regular />
          <span>Saved</span>
        </div>
      );
    }
    if (saveStatus === 'error') {
      return (
        <div className={`${styles.saveStatus} ${styles.saveStatusError}`}>
          <Warning20Regular />
          <span>Error saving</span>
        </div>
      );
    }
    if (hasUnsavedChanges) {
      return (
        <div className={`${styles.saveStatus} ${styles.saveStatusSaving}`}>
          <span>Unsaved changes</span>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="large" label="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header with Greeting */}
      <div className={styles.header}>
        <div className={styles.greeting}>
          <Title2>Welcome back, {user?.name?.split(' ')[0] || 'User'}</Title2>
          <Caption1>Click any day to add hours</Caption1>
        </div>
        <div className={styles.actionButtons}>
          {renderSaveStatus()}
          {!isReadOnly && canSubmit && (
            <Button
              appearance="primary"
              icon={<Send24Regular />}
              onClick={handleSubmitClick}
              disabled={isSubmitting || hasUnsavedChanges}
              title={submitBlockedReason || undefined}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Timesheet'}
            </Button>
          )}
          <Button
            appearance="subtle"
            icon={<DocumentBulletList24Regular />}
            onClick={() => navigate('/timesheets/entry')}
          >
            Full View
          </Button>
        </div>
      </div>

      {/* Current Week Timecard */}
      <section className={styles.timecardSection}>
        <div className={styles.timecardHeader}>
          <div className={styles.sectionTitle}>
            <Clock24Regular />
            <Body1Strong>This Week</Body1Strong>
            {timesheet && (
              <Badge
                appearance={timesheet.status === 'Approved' ? 'filled' : 'outline'}
                color={
                  timesheet.status === 'Approved' ? 'success' :
                  timesheet.status === 'Submitted' ? 'informative' :
                  timesheet.status === 'Returned' ? 'warning' : 'subtle'
                }
              >
                {timesheet.status}
              </Badge>
            )}
          </div>
        </div>

        <Card className={styles.timecardCard}>
          <div className={styles.weekDays}>
            {weekDates.map((date, idx) => {
              const dateStr = formatDate(date);
              const hours = getHoursForDate(date);
              const today = isToday(date);
              const isSelected = quickEntryDay === dateStr;
              return (
                <div
                  key={idx}
                  className={`${styles.dayColumn} ${today ? styles.dayColumnToday : ''} ${isReadOnly ? styles.dayColumnDisabled : ''}`}
                  onClick={() => !isReadOnly && setQuickEntryDay(dateStr)}
                  title={isReadOnly ? 'Timesheet is read-only' : `Select ${formatDayName(date)} for quick entry`}
                  style={isSelected && !isReadOnly ? { borderColor: '#286f1f', backgroundColor: '#e8f5e3' } : undefined}
                >
                  <span className={styles.dayName}>{formatDayName(date)}</span>
                  <span className={styles.dayDate}>{formatDayDate(date)}</span>
                  <span className={styles.dayHours}>{hours > 0 ? hours : '-'}</span>
                  {!isReadOnly && isSelected && (
                    <span className={styles.dayAddHint}>Selected</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Inline Quick Entry Row */}
          {!isReadOnly && (
            <div className={styles.quickEntryRow}>
              <Text className={styles.quickEntryLabel}>Quick Add:</Text>
              <Dropdown
                className={styles.quickEntryDropdown}
                placeholder="Select project"
                value={activeProjects.find(p => p.projectId.toString() === quickEntryProject)?.projectName || ''}
                selectedOptions={quickEntryProject ? [quickEntryProject] : []}
                onOptionSelect={(_, data) => setQuickEntryProject(data.optionValue || '')}
              >
                {activeProjects.map(p => (
                  <Option key={p.projectId} value={p.projectId.toString()} text={`${p.projectNumber} - ${p.projectName}`}>
                    {p.projectNumber} - {p.projectName}
                  </Option>
                ))}
              </Dropdown>
              <Input
                className={styles.quickEntryHours}
                type="number"
                value={quickEntryHours}
                onChange={(_, data) => setQuickEntryHours(data.value)}
                min={0.25}
                max={24}
                step={0.25}
                contentAfter={<Text size={200}>hrs</Text>}
              />
              <Dropdown
                className={styles.quickEntryDaySelect}
                value={weekDates.find(d => formatDate(d) === quickEntryDay)?.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }) || ''}
                selectedOptions={quickEntryDay ? [quickEntryDay] : []}
                onOptionSelect={(_, data) => setQuickEntryDay(data.optionValue || '')}
              >
                {weekDates.map(d => {
                  const dateStr = formatDate(d);
                  return (
                    <Option key={dateStr} value={dateStr}>
                      {d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })}
                    </Option>
                  );
                })}
              </Dropdown>
              <Button
                className={styles.quickEntryButton}
                appearance="primary"
                icon={<Add24Regular />}
                onClick={handleQuickEntry}
                disabled={!quickEntryProject || !quickEntryHours || !quickEntryDay}
              >
                Add
              </Button>
            </div>
          )}

          <div className={styles.totalHoursRow}>
            <div className={styles.totalHours}>
              <Text>Total Hours</Text>
              <Body1Strong style={{
                color: totalHours >= 40 ? '#286f1f' : totalHours >= 32 ? tokens.colorNeutralForeground1 : '#d83b01'
              }}>
                {totalHours.toFixed(1)} / 40
              </Body1Strong>
            </div>
          </div>

          <div className={styles.progressSection}>
            <ProgressBar
              value={Math.min(totalHours / 40, 1)}
              color={totalHours >= 40 ? 'success' : totalHours >= 32 ? 'brand' : 'warning'}
            />
          </div>
        </Card>
      </section>

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

      {/* Personal KPIs */}
      {personalKPIs && (
        <section>
          <div className={styles.sectionTitle}>
            <ChartMultiple24Regular />
            <Body1Strong>Your Stats (YTD)</Body1Strong>
          </div>

          <div className={styles.kpiGrid}>
            {/* Weekly Compliance */}
            <Card
              className={styles.kpiCard}
              onClick={() => handleKPIClick('approved')}
            >
              <div className={styles.kpiHeader}>
                <div>
                  <div className={styles.kpiValue} style={{
                    color: personalKPIs.weeklyCompliance.complianceRate >= 90
                      ? tokens.colorPaletteGreenForeground1
                      : personalKPIs.weeklyCompliance.complianceRate >= 70
                        ? tokens.colorPaletteYellowForeground1
                        : tokens.colorPaletteRedForeground1
                  }}>
                    {personalKPIs.weeklyCompliance.complianceRate}%
                  </div>
                  <div className={styles.kpiLabel}>Weekly Compliance</div>
                </div>
                <CheckmarkCircle24Regular />
              </div>
              <Text size={200}>
                {personalKPIs.weeklyCompliance.approvedWeeks} of {personalKPIs.weeklyCompliance.expectedWeeks} weeks approved
              </Text>
              <div className={styles.kpiProgress}>
                <ProgressBar
                  value={personalKPIs.weeklyCompliance.approvedWeeks / Math.max(personalKPIs.weeklyCompliance.expectedWeeks, 1)}
                  color={getComplianceColor(personalKPIs.weeklyCompliance.complianceRate)}
                />
              </div>
            </Card>

            {/* Daily Reporting */}
            <Card
              className={styles.kpiCard}
              onClick={() => handleKPIClick('all')}
            >
              <div className={styles.kpiHeader}>
                <div>
                  <div className={styles.kpiValue} style={{
                    color: personalKPIs.dailyReporting.reportingRate >= 90
                      ? tokens.colorPaletteGreenForeground1
                      : personalKPIs.dailyReporting.reportingRate >= 70
                        ? tokens.colorPaletteYellowForeground1
                        : tokens.colorPaletteRedForeground1
                  }}>
                    {personalKPIs.dailyReporting.reportingRate}%
                  </div>
                  <div className={styles.kpiLabel}>Daily Reporting</div>
                </div>
                <DocumentBulletList24Regular />
              </div>
              <Text size={200}>
                {personalKPIs.dailyReporting.actualDaysWorked} of {personalKPIs.dailyReporting.expectedWorkingDays} days logged
              </Text>
              <div className={styles.kpiProgress}>
                <ProgressBar
                  value={personalKPIs.dailyReporting.actualDaysWorked / Math.max(personalKPIs.dailyReporting.expectedWorkingDays, 1)}
                  color={getComplianceColor(personalKPIs.dailyReporting.reportingRate)}
                />
              </div>
            </Card>
          </div>
        </section>
      )}

      {/* Team Section (Managers Only) */}
      {isManager && teamKPIs && (
        <section className={styles.teamSection}>
          <div className={styles.sectionTitle}>
            <People24Regular />
            <Body1Strong>{teamKPIs.teamName} Team</Body1Strong>
            <Badge appearance="outline">{teamKPIs.employeeCount} employees</Badge>
          </div>

          <div className={styles.kpiGrid}>
            {/* Team Weekly Compliance */}
            <Card className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <div>
                  <div className={styles.kpiValue} style={{
                    color: teamKPIs.weeklyCompliance.averageComplianceRate >= 90
                      ? tokens.colorPaletteGreenForeground1
                      : teamKPIs.weeklyCompliance.averageComplianceRate >= 70
                        ? tokens.colorPaletteYellowForeground1
                        : tokens.colorPaletteRedForeground1
                  }}>
                    {teamKPIs.weeklyCompliance.averageComplianceRate}%
                  </div>
                  <div className={styles.kpiLabel}>Team Compliance</div>
                </div>
              </div>
              <Text size={200}>
                This week: {teamKPIs.weeklyCompliance.currentWeekStats.approved} approved,{' '}
                {teamKPIs.weeklyCompliance.currentWeekStats.submitted} pending,{' '}
                {teamKPIs.weeklyCompliance.currentWeekStats.missing} missing
              </Text>
            </Card>

            {/* Team Daily Reporting */}
            <Card className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <div>
                  <div className={styles.kpiValue} style={{
                    color: teamKPIs.dailyReporting.averageReportingRate >= 90
                      ? tokens.colorPaletteGreenForeground1
                      : teamKPIs.dailyReporting.averageReportingRate >= 70
                        ? tokens.colorPaletteYellowForeground1
                        : tokens.colorPaletteRedForeground1
                  }}>
                    {teamKPIs.dailyReporting.averageReportingRate}%
                  </div>
                  <div className={styles.kpiLabel}>Team Daily Reporting</div>
                </div>
              </div>
              <Text size={200}>
                {teamKPIs.dailyReporting.totalActualDays} of {teamKPIs.dailyReporting.totalExpectedDays} total days logged
              </Text>
            </Card>
          </div>
        </section>
      )}

      {/* Leaderboard - visible to all users */}
      {leaderboard.length > 0 && (
        <section>
          <Card className={styles.leaderboardCard}>
            <div className={styles.leaderboardHeader}>
              <div className={styles.sectionTitle}>
                <Trophy24Regular />
                <Body1Strong>{isManager ? 'Team Leaderboard' : 'Top Performers'}</Body1Strong>
              </div>
              <Caption1>Based on YTD compliance</Caption1>
            </div>

            <div className={styles.leaderboardList}>
              {leaderboard.slice(0, 5).map((entry, index) => {
                const effectiveRank = entry.rank || index + 1;
                const streakInfo = getStreakBadge(entry.streakWeeks);
                const getRankColors = (rank: number) => {
                  if (rank === 1) return { bg: '#FFD700', color: '#8B6914', shadow: '0 2px 8px rgba(255, 215, 0, 0.5)' };
                  if (rank === 2) return { bg: '#C0C0C0', color: '#4a4a4a', shadow: '0 2px 8px rgba(192, 192, 192, 0.5)' };
                  if (rank === 3) return { bg: '#CD7F32', color: '#5c3a1a', shadow: '0 2px 8px rgba(205, 127, 50, 0.5)' };
                  return { bg: '#e8f5e3', color: '#286f1f', shadow: 'none' };
                };
                const getRankLabel = (rank: number) => {
                  if (rank === 1) return '1st';
                  if (rank === 2) return '2nd';
                  if (rank === 3) return '3rd';
                  return `${rank}`;
                };
                const isTop3 = effectiveRank <= 3;
                const rankColors = getRankColors(effectiveRank);

                return (
                  <div
                    key={entry.userId}
                    className={`${styles.leaderboardItem} ${isTop3 ? styles.leaderboardItemTop3 : ''}`}
                  >
                    <div
                      className={styles.rankBadge}
                      style={{
                        backgroundColor: rankColors.bg,
                        color: rankColors.color,
                        boxShadow: rankColors.shadow,
                      }}
                    >
                      <span style={{ fontSize: isTop3 ? '16px' : '18px', fontWeight: 'bold' }}>{getRankLabel(effectiveRank)}</span>
                    </div>

                    <div className={styles.employeeInfo}>
                      <Body1Strong
                        style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'transparent' }}
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          navigate('/reports', { state: { userId: entry.userId.toString(), viewMode: 'byEmployee' } });
                        }}
                        onMouseOver={(e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.textDecorationColor = '#286f1f')}
                        onMouseOut={(e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.textDecorationColor = 'transparent')}
                      >
                        {entry.employeeName}
                      </Body1Strong>
                      <Caption1>
                        Weekly: {entry.weeklyComplianceRate.toFixed(0)}% | Daily: {entry.dailyReportingRate.toFixed(0)}%
                      </Caption1>
                    </div>

                    <div className={styles.scoreSection}>
                      {streakInfo && (
                        <div className={styles.streakBadge}>
                          <Fire20Regular />
                          <span>{entry.streakWeeks}w</span>
                        </div>
                      )}
                      <div className={styles.scoreValue}>
                        {entry.overallScore.toFixed(0)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {leaderboard.length > 5 && (
              <>
                <Divider style={{ margin: `${tokens.spacingVerticalM} 0` }} />
                <Button
                  appearance="subtle"
                  icon={<ArrowRight24Regular />}
                  iconPosition="after"
                  onClick={() => navigate('/scoreboard')}
                >
                  View Full Leaderboard
                </Button>
              </>
            )}
          </Card>
        </section>
      )}
    </div>
  );
};
