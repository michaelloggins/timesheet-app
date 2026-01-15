/**
 * Delegation Settings Component
 * Manage approval delegations for the Cascading Approvals system
 */

import { useState } from 'react';
import {
  Title2,
  Title3,
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
  Input,
  Field,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Divider,
  Checkbox,
} from '@fluentui/react-components';
import {
  Add24Regular,
  Delete24Regular,
  Person24Regular,
  Calendar24Regular,
  ArrowLeft24Regular,
  Dismiss24Regular,
  ArrowRight24Regular,
  PersonSwap24Regular,
} from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import { useDelegations, useEligibleDelegates, useDirectReports } from '../../hooks/useDelegations';
import { Delegation } from '../../types';

// Responsive breakpoints
const TABLET = '@media (max-width: 768px)';
const MOBILE = '@media (max-width: 480px)';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalL),
    maxWidth: '1000px',
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
  section: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalM),
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalM),
    [MOBILE]: {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
  },
  delegationList: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalS),
  },
  delegationCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalM),
    [TABLET]: {
      flexDirection: 'column',
      alignItems: 'stretch',
      ...shorthands.gap(tokens.spacingVerticalM),
    },
  },
  delegationInfo: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXS),
  },
  delegationMeta: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalM),
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
  actionButton: {
    [MOBILE]: {
      width: '100%',
      minHeight: '44px',
    },
  },
  emptyState: {
    textAlign: 'center',
    ...shorthands.padding(tokens.spacingVerticalXL),
    color: tokens.colorNeutralForeground3,
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '200px',
  },
  // Dialog styles
  dialogSurface: {
    maxWidth: '500px',
    width: '90vw',
    [MOBILE]: {
      maxWidth: '100%',
      width: '100%',
      maxHeight: '100vh',
      ...shorthands.margin(0),
      ...shorthands.borderRadius(0),
    },
  },
  formField: {
    marginBottom: tokens.spacingVerticalM,
  },
  dialogActions: {
    display: 'flex',
    ...shorthands.gap(tokens.spacingHorizontalM),
    [MOBILE]: {
      flexDirection: 'column',
      ...shorthands.gap(tokens.spacingVerticalS),
      '& button': {
        width: '100%',
        minHeight: '44px',
      },
    },
  },
  activeChip: {
    backgroundColor: tokens.colorPaletteGreenBackground2,
    color: tokens.colorPaletteGreenForeground2,
  },
  inactiveChip: {
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground3,
  },
  employeeList: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXS),
    maxHeight: '200px',
    overflowY: 'auto',
    ...shorthands.padding(tokens.spacingVerticalS),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground2,
  },
  scopedBadge: {
    marginLeft: tokens.spacingHorizontalS,
    fontSize: tokens.fontSizeBase100,
  },
  delegationDirection: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalS),
  },
  arrowIcon: {
    color: tokens.colorNeutralForeground3,
  },
});

interface CreateDelegationFormData {
  delegateUserId: number | null;
  startDate: string;
  endDate: string;
  reason: string;
  employeeIds: number[];  // Specific employees to scope (empty = all direct reports)
}

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const isActiveDelegation = (delegation: Delegation): boolean => {
  const now = new Date();
  const start = new Date(delegation.startDate);
  const end = new Date(delegation.endDate);
  return delegation.isActive && start <= now && end >= now;
};

interface DelegationSettingsProps {
  embedded?: boolean;
}

export const DelegationSettings = ({ embedded = false }: DelegationSettingsProps) => {
  const styles = useStyles();
  const navigate = useNavigate();

  // State
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);
  const [selectedDelegation, setSelectedDelegation] = useState<Delegation | null>(null);
  const [formData, setFormData] = useState<CreateDelegationFormData>({
    delegateUserId: null,
    startDate: '',
    endDate: '',
    reason: '',
    employeeIds: [],
  });

  // Hooks
  const {
    given,
    received,
    isLoading,
    error,
    create,
    revoke,
    isCreating,
    isRevoking,
    createError,
    revokeError,
  } = useDelegations();

  const { data: eligibleDelegates = [], isLoading: loadingDelegates } = useEligibleDelegates();
  const { data: directReports = [], isLoading: loadingDirectReports } = useDirectReports();

  // Handlers
  const handleOpenCreateDialog = () => {
    setFormData({
      delegateUserId: null,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      reason: '',
      employeeIds: [],
    });
    setIsCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setFormData({
      delegateUserId: null,
      startDate: '',
      endDate: '',
      reason: '',
      employeeIds: [],
    });
  };

  const handleCreateDelegation = async () => {
    if (!formData.delegateUserId || !formData.startDate || !formData.endDate) {
      return;
    }

    try {
      await create({
        delegateUserId: formData.delegateUserId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason || undefined,
        employeeIds: formData.employeeIds.length > 0 ? formData.employeeIds : undefined,
      });
      handleCloseCreateDialog();
    } catch (err) {
      console.error('Failed to create delegation:', err);
    }
  };

  const handleEmployeeToggle = (userId: number) => {
    setFormData((prev) => ({
      ...prev,
      employeeIds: prev.employeeIds.includes(userId)
        ? prev.employeeIds.filter((id) => id !== userId)
        : [...prev.employeeIds, userId],
    }));
  };

  const handleOpenRevokeDialog = (delegation: Delegation) => {
    setSelectedDelegation(delegation);
    setIsRevokeDialogOpen(true);
  };

  const handleCloseRevokeDialog = () => {
    setIsRevokeDialogOpen(false);
    setSelectedDelegation(null);
  };

  const handleRevokeDelegation = async () => {
    if (!selectedDelegation) return;

    try {
      await revoke(selectedDelegation.delegationId);
      handleCloseRevokeDialog();
    } catch (err) {
      console.error('Failed to revoke delegation:', err);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="large" label="Loading delegations..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>Error loading delegations</MessageBarTitle>
            {error.message}
          </MessageBarBody>
        </MessageBar>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header - only show when not embedded */}
      {!embedded && (
        <>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <Button
                appearance="subtle"
                icon={<ArrowLeft24Regular />}
                onClick={() => navigate('/')}
                className={styles.backButton}
              />
              <PersonSwap24Regular style={{ fontSize: '28px' }} />
              <Title2 className={styles.headerTitle}>Delegation Settings</Title2>
            </div>
          </div>

          <Text>
            Delegations allow you to authorize another user to approve timesheets on your behalf during
            your absence. The delegate will see pending approvals that would normally come to you.
          </Text>
        </>
      )}

      {/* Delegations Given Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <Title3>Delegations You Have Given</Title3>
          <Button
            appearance="primary"
            icon={<Add24Regular />}
            onClick={handleOpenCreateDialog}
            className={styles.actionButton}
          >
            Create Delegation
          </Button>
        </div>

        <Divider />

        {given.length === 0 ? (
          <Card className={styles.emptyState}>
            <Text>You have not delegated your approval authority to anyone.</Text>
          </Card>
        ) : (
          <div className={styles.delegationList}>
            {given.map((delegation) => (
              <Card key={delegation.delegationId} className={styles.delegationCard}>
                <div className={styles.delegationInfo}>
                  <div className={styles.delegationDirection}>
                    <Body1Strong>You</Body1Strong>
                    <ArrowRight24Regular className={styles.arrowIcon} />
                    <Body1Strong>{delegation.delegateName}</Body1Strong>
                    <Badge
                      appearance="filled"
                      className={
                        isActiveDelegation(delegation) ? styles.activeChip : styles.inactiveChip
                      }
                    >
                      {isActiveDelegation(delegation) ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className={styles.delegationMeta}>
                    <div className={styles.metaItem}>
                      <Calendar24Regular style={{ fontSize: '16px' }} />
                      <Text>
                        {formatDate(delegation.startDate)} - {formatDate(delegation.endDate)}
                      </Text>
                    </div>
                    <div className={styles.metaItem}>
                      <Person24Regular style={{ fontSize: '16px' }} />
                      <Caption1>{delegation.delegateEmail}</Caption1>
                    </div>
                  </div>
                  {delegation.reason && (
                    <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
                      Reason: {delegation.reason}
                    </Caption1>
                  )}
                  {delegation.scopedEmployees && delegation.scopedEmployees.length > 0 && (
                    <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
                      Scoped to: {delegation.scopedEmployees.map((e) => e.name).join(', ')}
                    </Caption1>
                  )}
                </div>
                {delegation.isActive && (
                  <Button
                    appearance="subtle"
                    icon={<Delete24Regular />}
                    onClick={() => handleOpenRevokeDialog(delegation)}
                    className={styles.actionButton}
                  >
                    Revoke
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delegations Received Section */}
      <div className={styles.section}>
        <Title3>Delegations You Have Received</Title3>
        <Divider />

        {received.length === 0 ? (
          <Card className={styles.emptyState}>
            <Text>No one has delegated their approval authority to you.</Text>
          </Card>
        ) : (
          <div className={styles.delegationList}>
            {received.map((delegation) => (
              <Card key={delegation.delegationId} className={styles.delegationCard}>
                <div className={styles.delegationInfo}>
                  <div className={styles.delegationDirection}>
                    <Body1Strong>{delegation.delegatorName}</Body1Strong>
                    <ArrowRight24Regular className={styles.arrowIcon} />
                    <Body1Strong>You</Body1Strong>
                    <Badge
                      appearance="filled"
                      className={
                        isActiveDelegation(delegation) ? styles.activeChip : styles.inactiveChip
                      }
                    >
                      {isActiveDelegation(delegation) ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className={styles.delegationMeta}>
                    <div className={styles.metaItem}>
                      <Calendar24Regular style={{ fontSize: '16px' }} />
                      <Text>
                        {formatDate(delegation.startDate)} - {formatDate(delegation.endDate)}
                      </Text>
                    </div>
                    <div className={styles.metaItem}>
                      <Person24Regular style={{ fontSize: '16px' }} />
                      <Caption1>{delegation.delegatorEmail}</Caption1>
                    </div>
                  </div>
                  {delegation.reason && (
                    <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
                      Reason: {delegation.reason}
                    </Caption1>
                  )}
                  {delegation.scopedEmployees && delegation.scopedEmployees.length > 0 && (
                    <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
                      For employees: {delegation.scopedEmployees.map((e) => e.name).join(', ')}
                    </Caption1>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Delegation Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(_, data) => setIsCreateDialogOpen(data.open)}>
        <DialogSurface className={styles.dialogSurface}>
          <DialogTitle>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Create Delegation</span>
              <Button
                appearance="subtle"
                icon={<Dismiss24Regular />}
                onClick={handleCloseCreateDialog}
                aria-label="Close"
              />
            </div>
          </DialogTitle>
          <DialogBody>
            <DialogContent>
              {createError && (
                <MessageBar intent="error" style={{ marginBottom: tokens.spacingVerticalM }}>
                  <MessageBarBody>
                    <MessageBarTitle>Error</MessageBarTitle>
                    {createError.message}
                  </MessageBarBody>
                </MessageBar>
              )}

              <Field label="Delegate To" required className={styles.formField}>
                <Dropdown
                  placeholder="Select a user"
                  value={
                    eligibleDelegates.find((d) => d.userId === formData.delegateUserId)?.name || ''
                  }
                  onOptionSelect={(_, data) => {
                    const userId = data.optionValue ? parseInt(data.optionValue, 10) : null;
                    setFormData((prev) => ({
                      ...prev,
                      delegateUserId: userId,
                    }));
                  }}
                  disabled={loadingDelegates}
                >
                  {eligibleDelegates.map((delegate) => (
                    <Option key={delegate.userId} value={delegate.userId.toString()}>
                      {`${delegate.name} (${delegate.email})`}
                    </Option>
                  ))}
                </Dropdown>
              </Field>

              {directReports.length > 0 && (
                <Field
                  label="Scope to Specific Employees (Optional)"
                  hint="Leave empty to delegate for all your direct reports"
                  className={styles.formField}
                >
                  {loadingDirectReports ? (
                    <Spinner size="tiny" label="Loading employees..." />
                  ) : (
                    <div className={styles.employeeList}>
                      {directReports.map((employee) => (
                        <Checkbox
                          key={employee.userId}
                          label={`${employee.name} (${employee.email})`}
                          checked={formData.employeeIds.includes(employee.userId)}
                          onChange={() => handleEmployeeToggle(employee.userId)}
                        />
                      ))}
                    </div>
                  )}
                  {formData.employeeIds.length > 0 && (
                    <Caption1 style={{ marginTop: tokens.spacingVerticalXS }}>
                      {formData.employeeIds.length} employee(s) selected
                    </Caption1>
                  )}
                </Field>
              )}

              <Field label="Start Date" required className={styles.formField}>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(_, data) =>
                    setFormData((prev) => ({ ...prev, startDate: data.value }))
                  }
                />
              </Field>

              <Field label="End Date" required className={styles.formField}>
                <Input
                  type="date"
                  value={formData.endDate}
                  min={formData.startDate}
                  onChange={(_, data) =>
                    setFormData((prev) => ({ ...prev, endDate: data.value }))
                  }
                />
              </Field>

              <Field label="Reason (Optional)" className={styles.formField}>
                <Input
                  placeholder="e.g., Vacation, Medical Leave"
                  value={formData.reason}
                  onChange={(_, data) =>
                    setFormData((prev) => ({ ...prev, reason: data.value }))
                  }
                />
              </Field>
            </DialogContent>
            <DialogActions className={styles.dialogActions}>
              <Button
                appearance="primary"
                onClick={handleCreateDelegation}
                disabled={
                  isCreating ||
                  !formData.delegateUserId ||
                  !formData.startDate ||
                  !formData.endDate
                }
              >
                {isCreating ? 'Creating...' : 'Create Delegation'}
              </Button>
              <Button appearance="subtle" onClick={handleCloseCreateDialog}>
                Cancel
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Revoke Delegation Dialog */}
      <Dialog open={isRevokeDialogOpen} onOpenChange={(_, data) => setIsRevokeDialogOpen(data.open)}>
        <DialogSurface className={styles.dialogSurface}>
          <DialogTitle>Revoke Delegation</DialogTitle>
          <DialogBody>
            <DialogContent>
              {revokeError && (
                <MessageBar intent="error" style={{ marginBottom: tokens.spacingVerticalM }}>
                  <MessageBarBody>
                    <MessageBarTitle>Error</MessageBarTitle>
                    {revokeError.message}
                  </MessageBarBody>
                </MessageBar>
              )}
              <Text>
                Are you sure you want to revoke the delegation to{' '}
                <strong>{selectedDelegation?.delegateName}</strong>?
              </Text>
              <Text
                style={{
                  display: 'block',
                  marginTop: tokens.spacingVerticalM,
                  color: tokens.colorNeutralForeground3,
                }}
              >
                This will immediately remove their ability to approve timesheets on your behalf.
              </Text>
            </DialogContent>
            <DialogActions className={styles.dialogActions}>
              <Button
                appearance="primary"
                onClick={handleRevokeDelegation}
                disabled={isRevoking}
                style={{ backgroundColor: tokens.colorPaletteRedBackground3 }}
              >
                {isRevoking ? 'Revoking...' : 'Revoke Delegation'}
              </Button>
              <Button appearance="subtle" onClick={handleCloseRevokeDialog}>
                Cancel
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};

export default DelegationSettings;
