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
} from '@fluentui/react-components';
import {
  Add24Regular,
  Calendar24Regular,
  Clock24Regular,
  CheckmarkCircle24Regular,
  ArrowUndo24Regular,
  Edit24Regular,
} from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getMyTimesheets } from '../../services/timesheetService';
import { Timesheet } from '../../types';

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
  filters: {
    display: 'flex',
    ...shorthands.gap(tokens.spacingHorizontalM),
    alignItems: 'center',
  },
  timesheetCard: {
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: tokens.shadow8,
    },
  },
  cardContent: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    ...shorthands.gap(tokens.spacingHorizontalM),
    alignItems: 'center',
  },
  timesheetInfo: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXS),
  },
  timesheetMeta: {
    display: 'flex',
    ...shorthands.gap(tokens.spacingHorizontalM),
    alignItems: 'center',
  },
  statusBadge: {
    display: 'flex',
    ...shorthands.gap(tokens.spacingHorizontalS),
    alignItems: 'center',
  },
  emptyState: {
    textAlign: 'center',
    ...shorthands.padding(tokens.spacingVerticalXXXL),
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '300px',
  },
  monthGroup: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalM),
  },
  monthHeader: {
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },
});

type StatusFilter = 'All' | 'Draft' | 'Submitted' | 'Approved' | 'Returned';

export const TimesheetList = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');

  const {
    data: timesheets = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['timesheets'],
    queryFn: getMyTimesheets,
  });

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

  // Filter timesheets by status
  const filteredTimesheets = timesheets.filter((ts) =>
    statusFilter === 'All' ? true : ts.status === statusFilter
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
        >
          New Timesheet
        </Button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <Text weight="semibold">Filter by status:</Text>
        <Dropdown
          placeholder="All statuses"
          value={statusFilter}
          onOptionSelect={(_, data) => setStatusFilter(data.optionValue as StatusFilter)}
          style={{ minWidth: '200px' }}
        >
          <Option value="All">All Statuses</Option>
          <Option value="Draft">Draft</Option>
          <Option value="Submitted">Submitted</Option>
          <Option value="Approved">Approved</Option>
          <Option value="Returned">Returned</Option>
        </Dropdown>
        <Caption1>
          Showing {filteredTimesheets.length} of {timesheets.length} timesheets
        </Caption1>
      </div>

      {/* Empty State */}
      {filteredTimesheets.length === 0 && (
        <Card className={styles.emptyState}>
          <Calendar24Regular style={{ fontSize: '48px', color: tokens.colorNeutralForeground3 }} />
          <Title2>No timesheets found</Title2>
          <Text>
            {statusFilter === 'All'
              ? "You haven't created any timesheets yet."
              : `No timesheets with status "${statusFilter}".`}
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
              .map((timesheet) => (
                <Card
                  key={timesheet.timesheetId}
                  className={styles.timesheetCard}
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
                    <Button appearance="subtle" icon={<Edit24Regular />}>
                      {timesheet.status === 'Draft' ? 'Edit' : 'View'}
                    </Button>
                  </div>
                </Card>
              ))}
          </div>
        );
      })}
    </div>
  );
};
