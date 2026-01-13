/**
 * Approvals List Component
 * Shows timesheets pending manager approval with filtering and responsive design
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
  Textarea,
  Divider,
  mergeClasses,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
} from '@fluentui/react-components';
import {
  CheckmarkCircle24Regular,
  ArrowUndo24Regular,
  Clock24Regular,
  Person24Regular,
  Calendar24Regular,
  Eye24Regular,
  Dismiss24Regular,
  Warning24Regular,
  ArrowLeft24Regular,
} from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import { useApprovals, useTimesheetEntries } from '../../hooks/useApprovals';
import {
  ApprovalStatus,
  ApprovalTimesheet,
  getRagStatus,
  formatDateRange,
} from '../../services/approvalService';

// Responsive breakpoints
const TABLET = '@media (max-width: 768px)';
const MOBILE = '@media (max-width: 480px)';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalL),
    [MOBILE]: {
      ...shorthands.gap(tokens.spacingVerticalM),
    },
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    ...shorthands.gap(tokens.spacingVerticalM),
    [TABLET]: {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalM),
  },
  headerTitle: {
    [MOBILE]: {
      fontSize: tokens.fontSizeBase500,
    },
  },
  backButton: {
    [MOBILE]: {
      display: 'none',
    },
  },
  filters: {
    display: 'flex',
    ...shorthands.gap(tokens.spacingHorizontalM),
    alignItems: 'center',
    flexWrap: 'wrap',
    [TABLET]: {
      width: '100%',
    },
    [MOBILE]: {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
  },
  filterDropdown: {
    minWidth: '200px',
    [MOBILE]: {
      minWidth: 'unset',
      width: '100%',
    },
  },
  filterCount: {
    color: tokens.colorNeutralForeground3,
    [MOBILE]: {
      textAlign: 'center',
    },
  },
  statsRow: {
    display: 'flex',
    ...shorthands.gap(tokens.spacingHorizontalL),
    flexWrap: 'wrap',
    [TABLET]: {
      ...shorthands.gap(tokens.spacingHorizontalM),
    },
    [MOBILE]: {
      flexDirection: 'column',
      ...shorthands.gap(tokens.spacingVerticalS),
    },
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalS),
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    [MOBILE]: {
      justifyContent: 'space-between',
      ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalM),
    },
  },
  statUrgent: {
    backgroundColor: tokens.colorPaletteYellowBackground1,
  },
  statCritical: {
    backgroundColor: tokens.colorPaletteRedBackground1,
  },
  approvalsList: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalM),
  },
  approvalCard: {
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: tokens.shadow8,
    },
    [MOBILE]: {
      ':hover': {
        transform: 'none',
      },
      ':active': {
        backgroundColor: tokens.colorNeutralBackground1Pressed,
      },
    },
  },
  cardNormal: {},
  cardAmber: {
    borderLeft: `4px solid ${tokens.colorPaletteYellowBorder2}`,
  },
  cardRed: {
    borderLeft: `4px solid ${tokens.colorPaletteRedBorder2}`,
    backgroundColor: tokens.colorPaletteRedBackground1,
  },
  cardGreen: {
    borderLeft: `4px solid ${tokens.colorPaletteGreenBorder2}`,
    backgroundColor: tokens.colorPaletteGreenBackground1,
  },
  cardReturned: {
    borderLeft: `4px solid ${tokens.colorPaletteYellowBorder2}`,
    backgroundColor: tokens.colorPaletteYellowBackground1,
  },
  cardContent: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    ...shorthands.gap(tokens.spacingHorizontalM),
    alignItems: 'center',
    [TABLET]: {
      gridTemplateColumns: '1fr',
      ...shorthands.gap(tokens.spacingVerticalM),
    },
  },
  approvalInfo: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXS),
  },
  employeeRow: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalS),
  },
  ragIndicator: {
    width: '12px',
    height: '12px',
    ...shorthands.borderRadius('50%'),
    flexShrink: 0,
  },
  ragNormal: {
    backgroundColor: tokens.colorNeutralForeground3,
  },
  ragAmber: {
    backgroundColor: tokens.colorPaletteYellowBackground3,
  },
  ragRed: {
    backgroundColor: tokens.colorPaletteRedBackground3,
  },
  ragGreen: {
    backgroundColor: tokens.colorPaletteGreenBackground3,
  },
  approvalMeta: {
    display: 'flex',
    ...shorthands.gap(tokens.spacingHorizontalM),
    alignItems: 'center',
    flexWrap: 'wrap',
    [MOBILE]: {
      flexDirection: 'column',
      alignItems: 'flex-start',
      ...shorthands.gap(tokens.spacingVerticalXS),
    },
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalXS),
  },
  actionButtons: {
    display: 'flex',
    ...shorthands.gap(tokens.spacingHorizontalS),
    flexShrink: 0,
    [TABLET]: {
      width: '100%',
      justifyContent: 'flex-start',
    },
    [MOBILE]: {
      flexDirection: 'column',
      ...shorthands.gap(tokens.spacingVerticalS),
    },
  },
  actionButton: {
    minWidth: 'auto',
    [MOBILE]: {
      width: '100%',
      minHeight: '44px',
      justifyContent: 'center',
    },
  },
  emptyState: {
    textAlign: 'center',
    ...shorthands.padding(tokens.spacingVerticalXXXL),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingVerticalM),
    [MOBILE]: {
      ...shorthands.padding(tokens.spacingVerticalXL),
    },
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '300px',
    [MOBILE]: {
      minHeight: '200px',
    },
  },
  // Dialog styles
  dialogSurface: {
    maxWidth: '700px',
    width: '90vw',
    [MOBILE]: {
      maxWidth: '100%',
      width: '100%',
      maxHeight: '100vh',
      height: '100vh',
      ...shorthands.margin(0),
      ...shorthands.borderRadius(0),
    },
  },
  dialogHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    [MOBILE]: {
      flexDirection: 'column',
      ...shorthands.gap(tokens.spacingVerticalS),
    },
  },
  dialogContent: {
    ...shorthands.overflow('auto'),
    maxHeight: '60vh',
    [MOBILE]: {
      maxHeight: 'calc(100vh - 200px)',
    },
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    ...shorthands.gap(tokens.spacingHorizontalM),
    marginBottom: tokens.spacingVerticalM,
    [MOBILE]: {
      gridTemplateColumns: '1fr',
      ...shorthands.gap(tokens.spacingVerticalS),
    },
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXXS),
    [MOBILE]: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
  },
  entriesTable: {
    width: '100%',
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.overflow('hidden'),
    overflowX: 'auto',
    [MOBILE]: {
      display: 'none',
    },
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '500px',
  },
  tableHeader: {
    backgroundColor: tokens.colorNeutralBackground3,
    '& th': {
      ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
      textAlign: 'left',
      fontWeight: tokens.fontWeightSemibold,
      fontSize: tokens.fontSizeBase200,
    },
  },
  tableRow: {
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    '& td': {
      ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
      fontSize: tokens.fontSizeBase300,
    },
  },
  // Mobile entries list
  entriesList: {
    display: 'none',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalS),
    [MOBILE]: {
      display: 'flex',
    },
  },
  entryCard: {
    ...shorthands.padding(tokens.spacingVerticalM),
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },
  entryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dialogActions: {
    display: 'flex',
    ...shorthands.gap(tokens.spacingHorizontalM),
    flexWrap: 'wrap',
    [MOBILE]: {
      flexDirection: 'column',
      ...shorthands.gap(tokens.spacingVerticalS),
      '& button': {
        width: '100%',
        minHeight: '44px',
      },
    },
  },
  returnReasonInput: {
    width: '100%',
    marginTop: tokens.spacingVerticalM,
  },
});

const STATUS_OPTIONS: { value: ApprovalStatus; label: string }[] = [
  { value: 'Submitted', label: 'Pending' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Returned', label: 'Returned' },
];

export const ApprovalsList = () => {
  const styles = useStyles();
  const navigate = useNavigate();

  // Filter state (default to Submitted only)
  const [selectedStatuses, setSelectedStatuses] = useState<ApprovalStatus[]>(['Submitted']);

  // Dialog state
  const [selectedApproval, setSelectedApproval] = useState<ApprovalTimesheet | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');

  // Fetch approvals with current filter
  const {
    approvals,
    isLoading,
    error,
    approve,
    sendBack,
    isApproving,
    isReturning,
    stats,
  } = useApprovals({ statuses: selectedStatuses });

  // Fetch entries for selected timesheet
  const { entries, totalHours, isLoading: entriesLoading } = useTimesheetEntries(
    selectedApproval?.timesheetId ?? null
  );

  // Get RAG styling for a card
  const getCardClass = (approval: ApprovalTimesheet) => {
    if (approval.status === 'Approved') return styles.cardGreen;
    if (approval.status === 'Returned') return styles.cardReturned;
    const rag = getRagStatus(approval.status, approval.daysWaiting);
    if (rag === 'red') return styles.cardRed;
    if (rag === 'amber') return styles.cardAmber;
    return styles.cardNormal;
  };

  const getRagIndicatorClass = (approval: ApprovalTimesheet) => {
    if (approval.status === 'Approved') return styles.ragGreen;
    const rag = getRagStatus(approval.status, approval.daysWaiting);
    if (rag === 'red') return styles.ragRed;
    if (rag === 'amber') return styles.ragAmber;
    return styles.ragNormal;
  };

  const handleStatusChange = (values: string[]) => {
    if (values.length === 0) {
      setSelectedStatuses(['Submitted']);
    } else {
      setSelectedStatuses(values as ApprovalStatus[]);
    }
  };

  const handleViewDetails = (approval: ApprovalTimesheet) => {
    setSelectedApproval(approval);
    setIsDetailOpen(true);
  };

  const handleApprove = async (approval: ApprovalTimesheet) => {
    try {
      await approve(approval.timesheetId);
      setIsDetailOpen(false);
    } catch (err) {
      console.error('Failed to approve:', err);
    }
  };

  const handleOpenReturnDialog = (approval: ApprovalTimesheet) => {
    setSelectedApproval(approval);
    setIsReturnDialogOpen(true);
    setIsDetailOpen(false);
  };

  const handleReturn = async () => {
    if (selectedApproval && returnReason.trim()) {
      try {
        await sendBack(selectedApproval.timesheetId, returnReason);
        setIsReturnDialogOpen(false);
        setReturnReason('');
      } catch (err) {
        console.error('Failed to return:', err);
      }
    }
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="large" label="Loading approvals..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>Error loading approvals</MessageBarTitle>
            {error.message}
          </MessageBarBody>
        </MessageBar>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Button
            appearance="subtle"
            icon={<ArrowLeft24Regular />}
            onClick={() => navigate('/')}
            className={styles.backButton}
          />
          <Title2 className={styles.headerTitle}>Approvals</Title2>
        </div>

        <div className={styles.filters}>
          <Dropdown
            className={styles.filterDropdown}
            placeholder="Filter by status"
            multiselect
            selectedOptions={selectedStatuses}
            onOptionSelect={(_, data) => handleStatusChange(data.selectedOptions)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <Option key={opt.value} value={opt.value}>
                {opt.label}
              </Option>
            ))}
          </Dropdown>
          <Text className={styles.filterCount}>
            {approvals.length} timesheet{approvals.length !== 1 ? 's' : ''}
          </Text>
        </div>
      </div>

      {/* Stats Row */}
      {selectedStatuses.includes('Submitted') && (
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <Clock24Regular />
            <Text weight="semibold">{stats.pendingCount}</Text>
            <Text>Awaiting Review</Text>
          </div>
          {stats.urgentCount > 0 && (
            <div className={mergeClasses(styles.statCard, styles.statUrgent)}>
              <Warning24Regular />
              <Text weight="semibold">{stats.urgentCount}</Text>
              <Text>1+ Week Waiting</Text>
            </div>
          )}
          {stats.criticalCount > 0 && (
            <div className={mergeClasses(styles.statCard, styles.statCritical)}>
              <Warning24Regular />
              <Text weight="semibold">{stats.criticalCount}</Text>
              <Text>4+ Weeks Waiting</Text>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {approvals.length === 0 && (
        <Card className={styles.emptyState}>
          <CheckmarkCircle24Regular
            style={{ fontSize: '48px', color: tokens.colorNeutralForeground3 }}
          />
          <Title2>All caught up!</Title2>
          <Text>No timesheets matching your filter.</Text>
        </Card>
      )}

      {/* Approval Cards */}
      <div className={styles.approvalsList}>
        {approvals.map((approval) => (
          <Card
            key={approval.timesheetId}
            className={mergeClasses(styles.approvalCard, getCardClass(approval))}
            onClick={() => handleViewDetails(approval)}
          >
            <div className={styles.cardContent}>
              <div className={styles.approvalInfo}>
                <div className={styles.employeeRow}>
                  <div
                    className={mergeClasses(styles.ragIndicator, getRagIndicatorClass(approval))}
                  />
                  <Body1Strong>{approval.employeeName}</Body1Strong>
                  {approval.status === 'Approved' && (
                    <Badge appearance="filled" color="success">
                      Approved
                    </Badge>
                  )}
                  {approval.status === 'Returned' && (
                    <Badge appearance="filled" color="warning">
                      Returned
                    </Badge>
                  )}
                </div>
                <div className={styles.approvalMeta}>
                  <div className={styles.metaItem}>
                    <Calendar24Regular style={{ fontSize: '16px' }} />
                    <Text>{formatDateRange(approval.periodStart, approval.periodEnd)}</Text>
                  </div>
                  <div className={styles.metaItem}>
                    <Clock24Regular style={{ fontSize: '16px' }} />
                    <Text>{approval.totalHours} hours</Text>
                  </div>
                  {approval.status === 'Submitted' && (
                    <Badge
                      appearance={approval.daysWaiting >= 7 ? 'filled' : 'outline'}
                      color={
                        approval.daysWaiting >= 28
                          ? 'danger'
                          : approval.daysWaiting >= 7
                          ? 'warning'
                          : 'informative'
                      }
                    >
                      {approval.daysWaiting} day{approval.daysWaiting !== 1 ? 's' : ''} waiting
                    </Badge>
                  )}
                </div>
                {approval.submittedDate && (
                  <Caption1>
                    Submitted: {new Date(approval.submittedDate).toLocaleDateString()}
                  </Caption1>
                )}
                {approval.returnReason && (
                  <Caption1 style={{ color: tokens.colorPaletteRedForeground1 }}>
                    Return reason: {approval.returnReason}
                  </Caption1>
                )}
              </div>

              {approval.status === 'Submitted' && (
                <div className={styles.actionButtons} onClick={(e) => e.stopPropagation()}>
                  <Button
                    className={styles.actionButton}
                    appearance="subtle"
                    icon={<Eye24Regular />}
                    onClick={() => handleViewDetails(approval)}
                  >
                    View
                  </Button>
                  <Button
                    className={styles.actionButton}
                    appearance="primary"
                    icon={<CheckmarkCircle24Regular />}
                    onClick={() => handleApprove(approval)}
                    disabled={isApproving}
                  >
                    Approve
                  </Button>
                  <Button
                    className={styles.actionButton}
                    appearance="outline"
                    icon={<ArrowUndo24Regular />}
                    onClick={() => handleOpenReturnDialog(approval)}
                  >
                    Send Back
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={(_, data) => setIsDetailOpen(data.open)}>
        <DialogSurface className={styles.dialogSurface}>
          <DialogTitle>
            <div className={styles.dialogHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS }}>
                <Person24Regular />
                <span>{selectedApproval?.employeeName}</span>
              </div>
              <Button
                appearance="subtle"
                icon={<Dismiss24Regular />}
                onClick={() => setIsDetailOpen(false)}
                aria-label="Close"
              />
            </div>
          </DialogTitle>
          <DialogBody>
            <DialogContent className={styles.dialogContent}>
              {selectedApproval && (
                <>
                  {/* Summary Grid */}
                  <div className={styles.summaryGrid}>
                    <div className={styles.summaryItem}>
                      <Caption1>Period</Caption1>
                      <Text weight="semibold">
                        {formatDateRange(selectedApproval.periodStart, selectedApproval.periodEnd)}
                      </Text>
                    </div>
                    <div className={styles.summaryItem}>
                      <Caption1>Total Hours</Caption1>
                      <Text weight="semibold">{totalHours || selectedApproval.totalHours}</Text>
                    </div>
                    <div className={styles.summaryItem}>
                      <Caption1>Submitted</Caption1>
                      <Text weight="semibold">
                        {selectedApproval.submittedDate
                          ? new Date(selectedApproval.submittedDate).toLocaleDateString()
                          : '-'}
                      </Text>
                    </div>
                  </div>

                  <Divider style={{ margin: `${tokens.spacingVerticalM} 0` }} />

                  <Body1Strong style={{ marginBottom: tokens.spacingVerticalS, display: 'block' }}>
                    Time Entries
                  </Body1Strong>

                  {entriesLoading ? (
                    <Spinner size="small" label="Loading entries..." />
                  ) : entries.length === 0 ? (
                    <Text>No entries found.</Text>
                  ) : (
                    <>
                      {/* Desktop Table View */}
                      <div className={styles.entriesTable}>
                        <table className={styles.table}>
                          <thead className={styles.tableHeader}>
                            <tr>
                              <th>Date</th>
                              <th>Project</th>
                              <th>Hours</th>
                              <th>Location</th>
                              <th>Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entries.map((entry) => (
                              <tr key={entry.timeEntryId} className={styles.tableRow}>
                                <td>{formatDate(entry.workDate)}</td>
                                <td>
                                  {entry.projectNumber} - {entry.projectName}
                                </td>
                                <td>{entry.hoursWorked}</td>
                                <td>{entry.workLocation}</td>
                                <td>{entry.notes || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Card View */}
                      <div className={styles.entriesList}>
                        {entries.map((entry) => (
                          <div key={entry.timeEntryId} className={styles.entryCard}>
                            <div className={styles.entryRow}>
                              <Body1Strong>{formatDate(entry.workDate)}</Body1Strong>
                              <Badge appearance="outline">{entry.hoursWorked}h</Badge>
                            </div>
                            <div
                              className={styles.entryRow}
                              style={{ marginTop: tokens.spacingVerticalXS }}
                            >
                              <Caption1>
                                {entry.projectNumber} - {entry.projectName}
                              </Caption1>
                              <Caption1>{entry.workLocation}</Caption1>
                            </div>
                            {entry.notes && (
                              <Caption1
                                style={{
                                  marginTop: tokens.spacingVerticalXS,
                                  color: tokens.colorNeutralForeground3,
                                }}
                              >
                                {entry.notes}
                              </Caption1>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </DialogContent>
            <DialogActions className={styles.dialogActions}>
              {selectedApproval?.status === 'Submitted' && (
                <>
                  <Button
                    appearance="primary"
                    icon={<CheckmarkCircle24Regular />}
                    onClick={() => selectedApproval && handleApprove(selectedApproval)}
                    disabled={isApproving}
                  >
                    {isApproving ? 'Approving...' : 'Approve'}
                  </Button>
                  <Button
                    appearance="outline"
                    icon={<ArrowUndo24Regular />}
                    onClick={() => selectedApproval && handleOpenReturnDialog(selectedApproval)}
                  >
                    Send Back
                  </Button>
                </>
              )}
              <Button appearance="subtle" onClick={() => setIsDetailOpen(false)}>
                Close
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={isReturnDialogOpen} onOpenChange={(_, data) => setIsReturnDialogOpen(data.open)}>
        <DialogSurface className={styles.dialogSurface}>
          <DialogTitle>Send Back Timesheet</DialogTitle>
          <DialogBody>
            <DialogContent>
              <Text>
                Send this timesheet back to <strong>{selectedApproval?.employeeName}</strong> for
                revision.
              </Text>
              <Textarea
                className={styles.returnReasonInput}
                placeholder="Enter reason for returning (required)"
                value={returnReason}
                onChange={(_, data) => setReturnReason(data.value)}
                resize="vertical"
                style={{ minHeight: '100px' }}
              />
            </DialogContent>
            <DialogActions className={styles.dialogActions}>
              <Button
                appearance="primary"
                icon={<ArrowUndo24Regular />}
                onClick={handleReturn}
                disabled={!returnReason.trim() || isReturning}
              >
                {isReturning ? 'Sending...' : 'Send Back'}
              </Button>
              <Button appearance="subtle" onClick={() => setIsReturnDialogOpen(false)}>
                Cancel
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};
