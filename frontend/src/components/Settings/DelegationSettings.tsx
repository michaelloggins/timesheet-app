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
  Calendar24Regular,
  ArrowLeft24Regular,
  Dismiss24Regular,
  PersonSwap24Regular,
  Edit24Regular,
  PeopleTeam24Regular,
  Mail24Regular,
} from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import { useDelegations, useEligibleDelegates, useDirectReports } from '../../hooks/useDelegations';
import { useCurrentUser } from '../../hooks/useCurrentUser';
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
  delegateCard: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXS),
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
  },
  delegateHeader: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalS),
  },
  delegateAvatar: {
    width: '40px',
    height: '40px',
    ...shorthands.borderRadius('50%'),
    backgroundColor: tokens.colorBrandBackground,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: tokens.colorNeutralForegroundOnBrand,
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase400,
  },
  delegateDetails: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXXS),
  },
  delegateEmail: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalXS),
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  actionButtons: {
    display: 'flex',
    ...shorthands.gap(tokens.spacingHorizontalS),
    [MOBILE]: {
      flexDirection: 'column',
      '& button': {
        width: '100%',
        minHeight: '44px',
      },
    },
  },
  scopedEmployeesBadge: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalXS),
    ...shorthands.padding(tokens.spacingVerticalXS, tokens.spacingHorizontalS),
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    marginTop: tokens.spacingVerticalXS,
    cursor: 'pointer',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground3Hover,
    },
  },
  scopedEmployeesCount: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorBrandForeground1,
  },
  scopedEmployeesLabel: {
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
  },
  editEmployeesSection: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalS),
    marginTop: tokens.spacingVerticalS,
    ...shorthands.padding(tokens.spacingVerticalS),
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },
  employeeChip: {
    display: 'inline-flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalXS),
    ...shorthands.padding(tokens.spacingVerticalXXS, tokens.spacingHorizontalS),
    backgroundColor: tokens.colorNeutralBackground4,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    fontSize: tokens.fontSizeBase200,
  },
  employeeChipRemove: {
    cursor: 'pointer',
    ':hover': {
      color: tokens.colorPaletteRedForeground1,
    },
  },
  allEmployeesBadge: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalXS),
    ...shorthands.padding(tokens.spacingVerticalXS, tokens.spacingHorizontalS),
    backgroundColor: tokens.colorPaletteGreenBackground2,
    color: tokens.colorPaletteGreenForeground2,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    marginTop: tokens.spacingVerticalXS,
    fontSize: tokens.fontSizeBase200,
  },
});

interface CreateDelegationFormData {
  delegatorUserId: number | null;  // For TimesheetAdmins creating on behalf of another manager
  delegateUserId: number | null;
  startDate: string;
  endDate: string;
  reason: string;
  employeeIds: number[];  // Specific employees to scope (empty = all direct reports)
}

interface EditDelegationFormData {
  delegationId: number;
  endDate: string;
  reason: string;
  employeeIds: number[];
}

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getInitials = (name: string | undefined | null): string => {
  if (!name) return '?';
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
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
  const { user, isAdmin } = useCurrentUser();

  // State
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedDelegation, setSelectedDelegation] = useState<Delegation | null>(null);
  const [formData, setFormData] = useState<CreateDelegationFormData>({
    delegatorUserId: null,
    delegateUserId: null,
    startDate: '',
    endDate: '',
    reason: '',
    employeeIds: [],
  });
  const [editFormData, setEditFormData] = useState<EditDelegationFormData>({
    delegationId: 0,
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
    update,
    isCreating,
    isRevoking,
    isUpdating,
    createError,
    revokeError,
    updateError,
  } = useDelegations();

  const { data: eligibleDelegates = [], isLoading: loadingDelegates } = useEligibleDelegates();
  const { data: directReports = [], isLoading: loadingDirectReports } = useDirectReports();

  // For TimesheetAdmins: Get list of managers who can be delegated for
  // We reuse eligibleDelegates since those are users with Manager/Leadership/Admin roles
  const eligibleDelegators = eligibleDelegates.filter(d => d.userId !== user?.userId);

  // Handlers
  const handleOpenCreateDialog = () => {
    setFormData({
      delegatorUserId: null,  // null means current user (or selected manager for admins)
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
      delegatorUserId: null,
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
        delegatorUserId: formData.delegatorUserId || undefined,  // Only sent if admin creating on behalf of another
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

  const handleOpenEditDialog = (delegation: Delegation) => {
    setSelectedDelegation(delegation);
    setEditFormData({
      delegationId: delegation.delegationId,
      endDate: delegation.endDate.split('T')[0],
      reason: delegation.reason || '',
      employeeIds: delegation.scopedEmployees?.map((e) => e.userId) || [],
    });
    setIsEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setSelectedDelegation(null);
    setEditFormData({
      delegationId: 0,
      endDate: '',
      reason: '',
      employeeIds: [],
    });
  };

  const handleUpdateDelegation = async () => {
    if (!selectedDelegation) return;

    try {
      await update(editFormData.delegationId, {
        endDate: editFormData.endDate,
        reason: editFormData.reason || undefined,
        employeeIds: editFormData.employeeIds,
      });
      handleCloseEditDialog();
    } catch (err) {
      console.error('Failed to update delegation:', err);
    }
  };

  const handleEditEmployeeToggle = (userId: number) => {
    setEditFormData((prev) => ({
      ...prev,
      employeeIds: prev.employeeIds.includes(userId)
        ? prev.employeeIds.filter((id) => id !== userId)
        : [...prev.employeeIds, userId],
    }));
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
                  {/* Status Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS, marginBottom: tokens.spacingVerticalS }}>
                    <Badge
                      appearance="filled"
                      className={
                        isActiveDelegation(delegation) ? styles.activeChip : styles.inactiveChip
                      }
                    >
                      {isActiveDelegation(delegation) ? 'Active' : 'Inactive'}
                    </Badge>
                    <div className={styles.metaItem}>
                      <Calendar24Regular style={{ fontSize: '16px' }} />
                      <Text>
                        {formatDate(delegation.startDate)} - {formatDate(delegation.endDate)}
                      </Text>
                    </div>
                  </div>

                  {/* Delegate Info Card */}
                  <div className={styles.delegateCard}>
                    <Caption1 style={{ color: tokens.colorNeutralForeground3, marginBottom: tokens.spacingVerticalXS }}>
                      Delegated To:
                    </Caption1>
                    <div className={styles.delegateHeader}>
                      <div className={styles.delegateAvatar}>
                        {getInitials(delegation.delegateName)}
                      </div>
                      <div className={styles.delegateDetails}>
                        <Body1Strong>{delegation.delegateName || 'Unknown'}</Body1Strong>
                        <div className={styles.delegateEmail}>
                          <Mail24Regular style={{ fontSize: '14px' }} />
                          <span>{delegation.delegateEmail || 'No email'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Reason */}
                  {delegation.reason && (
                    <Caption1 style={{ color: tokens.colorNeutralForeground3, marginTop: tokens.spacingVerticalS }}>
                      Reason: {delegation.reason}
                    </Caption1>
                  )}

                  {/* Scoped Employees Display */}
                  {delegation.scopedEmployees && delegation.scopedEmployees.length > 0 ? (
                    <div className={styles.scopedEmployeesBadge} onClick={() => delegation.isActive && handleOpenEditDialog(delegation)}>
                      <PeopleTeam24Regular style={{ fontSize: '16px' }} />
                      <span className={styles.scopedEmployeesCount}>{delegation.scopedEmployees.length}</span>
                      <span className={styles.scopedEmployeesLabel}>
                        employee{delegation.scopedEmployees.length !== 1 ? 's' : ''} scoped
                      </span>
                      {delegation.isActive && <Edit24Regular style={{ fontSize: '14px', marginLeft: 'auto' }} />}
                    </div>
                  ) : (
                    <div className={styles.allEmployeesBadge}>
                      <PeopleTeam24Regular style={{ fontSize: '16px' }} />
                      <span>All direct reports</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {delegation.isActive && (
                  <div className={styles.actionButtons}>
                    <Button
                      appearance="subtle"
                      icon={<Edit24Regular />}
                      onClick={() => handleOpenEditDialog(delegation)}
                    >
                      Edit
                    </Button>
                    <Button
                      appearance="subtle"
                      icon={<Delete24Regular />}
                      onClick={() => handleOpenRevokeDialog(delegation)}
                      style={{ color: tokens.colorPaletteRedForeground1 }}
                    >
                      Revoke
                    </Button>
                  </div>
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
                  {/* Status Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS, marginBottom: tokens.spacingVerticalS }}>
                    <Badge
                      appearance="filled"
                      className={
                        isActiveDelegation(delegation) ? styles.activeChip : styles.inactiveChip
                      }
                    >
                      {isActiveDelegation(delegation) ? 'Active' : 'Inactive'}
                    </Badge>
                    <div className={styles.metaItem}>
                      <Calendar24Regular style={{ fontSize: '16px' }} />
                      <Text>
                        {formatDate(delegation.startDate)} - {formatDate(delegation.endDate)}
                      </Text>
                    </div>
                  </div>

                  {/* Delegator Info Card */}
                  <div className={styles.delegateCard}>
                    <Caption1 style={{ color: tokens.colorNeutralForeground3, marginBottom: tokens.spacingVerticalXS }}>
                      Delegated From:
                    </Caption1>
                    <div className={styles.delegateHeader}>
                      <div className={styles.delegateAvatar}>
                        {getInitials(delegation.delegatorName)}
                      </div>
                      <div className={styles.delegateDetails}>
                        <Body1Strong>{delegation.delegatorName}</Body1Strong>
                        <div className={styles.delegateEmail}>
                          <Mail24Regular style={{ fontSize: '14px' }} />
                          <span>{delegation.delegatorEmail}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Reason */}
                  {delegation.reason && (
                    <Caption1 style={{ color: tokens.colorNeutralForeground3, marginTop: tokens.spacingVerticalS }}>
                      Reason: {delegation.reason}
                    </Caption1>
                  )}

                  {/* Scoped Employees Display */}
                  {delegation.scopedEmployees && delegation.scopedEmployees.length > 0 ? (
                    <div className={styles.scopedEmployeesBadge} style={{ cursor: 'default' }}>
                      <PeopleTeam24Regular style={{ fontSize: '16px' }} />
                      <span className={styles.scopedEmployeesCount}>{delegation.scopedEmployees.length}</span>
                      <span className={styles.scopedEmployeesLabel}>
                        employee{delegation.scopedEmployees.length !== 1 ? 's' : ''}: {delegation.scopedEmployees.map((e) => e.name).join(', ')}
                      </span>
                    </div>
                  ) : (
                    <div className={styles.allEmployeesBadge}>
                      <PeopleTeam24Regular style={{ fontSize: '16px' }} />
                      <span>All direct reports of {delegation.delegatorName.split(' ')[0]}</span>
                    </div>
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

              {/* TimesheetAdmins can create delegations on behalf of managers */}
              {isAdmin && (
                <Field
                  label="Creating On Behalf Of"
                  hint="Leave empty to create a delegation for yourself"
                  className={styles.formField}
                >
                  <Dropdown
                    placeholder="Select a manager (optional)"
                    value={
                      eligibleDelegators.find((d) => d.userId === formData.delegatorUserId)?.name || ''
                    }
                    onOptionSelect={(_, data) => {
                      const userId = data.optionValue ? parseInt(data.optionValue, 10) : null;
                      setFormData((prev) => ({
                        ...prev,
                        delegatorUserId: userId,
                        employeeIds: [],  // Reset employee selection when delegator changes
                      }));
                    }}
                    disabled={loadingDelegates}
                  >
                    <Option key="self" value="">
                      Myself
                    </Option>
                    {eligibleDelegators.map((manager) => (
                      <Option key={manager.userId} value={manager.userId.toString()}>
                        {`${manager.name} (${manager.email})`}
                      </Option>
                    ))}
                  </Dropdown>
                </Field>
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

              {/* Employee scoping - only shown when creating for self (not on behalf of another manager) */}
              {directReports.length > 0 && !formData.delegatorUserId && (
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
              {/* Show note when admin is creating on behalf of another manager */}
              {isAdmin && formData.delegatorUserId && (
                <MessageBar intent="info" style={{ marginBottom: tokens.spacingVerticalM }}>
                  <MessageBarBody>
                    Employee scoping is not available when creating delegations on behalf of another manager.
                    The delegation will apply to all of the manager's direct reports.
                  </MessageBarBody>
                </MessageBar>
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

      {/* Edit Delegation Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(_, data) => setIsEditDialogOpen(data.open)}>
        <DialogSurface className={styles.dialogSurface}>
          <DialogTitle>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Edit Delegation</span>
              <Button
                appearance="subtle"
                icon={<Dismiss24Regular />}
                onClick={handleCloseEditDialog}
                aria-label="Close"
              />
            </div>
          </DialogTitle>
          <DialogBody>
            <DialogContent>
              {updateError && (
                <MessageBar intent="error" style={{ marginBottom: tokens.spacingVerticalM }}>
                  <MessageBarBody>
                    <MessageBarTitle>Error</MessageBarTitle>
                    {updateError.message}
                  </MessageBarBody>
                </MessageBar>
              )}

              {/* Delegate Info (read-only) */}
              {selectedDelegation && (
                <div className={styles.delegateCard} style={{ marginBottom: tokens.spacingVerticalM }}>
                  <Caption1 style={{ color: tokens.colorNeutralForeground3, marginBottom: tokens.spacingVerticalXS }}>
                    Delegated To:
                  </Caption1>
                  <div className={styles.delegateHeader}>
                    <div className={styles.delegateAvatar}>
                      {getInitials(selectedDelegation.delegateName)}
                    </div>
                    <div className={styles.delegateDetails}>
                      <Body1Strong>{selectedDelegation.delegateName}</Body1Strong>
                      <div className={styles.delegateEmail}>
                        <Mail24Regular style={{ fontSize: '14px' }} />
                        <span>{selectedDelegation.delegateEmail}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Start Date (read-only) */}
              {selectedDelegation && (
                <Field label="Start Date" className={styles.formField}>
                  <Input
                    type="date"
                    value={selectedDelegation.startDate.split('T')[0]}
                    disabled
                  />
                </Field>
              )}

              <Field label="End Date" required className={styles.formField}>
                <Input
                  type="date"
                  value={editFormData.endDate}
                  min={selectedDelegation?.startDate.split('T')[0]}
                  onChange={(_, data) =>
                    setEditFormData((prev) => ({ ...prev, endDate: data.value }))
                  }
                />
              </Field>

              <Field label="Reason (Optional)" className={styles.formField}>
                <Input
                  placeholder="e.g., Vacation, Medical Leave"
                  value={editFormData.reason}
                  onChange={(_, data) =>
                    setEditFormData((prev) => ({ ...prev, reason: data.value }))
                  }
                />
              </Field>

              {/* Employee Scoping */}
              {directReports.length > 0 && (
                <Field
                  label="Scope to Specific Employees"
                  hint="Select specific employees or leave empty for all direct reports"
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
                          checked={editFormData.employeeIds.includes(employee.userId)}
                          onChange={() => handleEditEmployeeToggle(employee.userId)}
                        />
                      ))}
                    </div>
                  )}
                  {editFormData.employeeIds.length > 0 ? (
                    <Caption1 style={{ marginTop: tokens.spacingVerticalXS }}>
                      {editFormData.employeeIds.length} employee(s) selected
                    </Caption1>
                  ) : (
                    <Caption1 style={{ marginTop: tokens.spacingVerticalXS, color: tokens.colorPaletteGreenForeground1 }}>
                      Applies to all direct reports
                    </Caption1>
                  )}
                </Field>
              )}
            </DialogContent>
            <DialogActions className={styles.dialogActions}>
              <Button
                appearance="primary"
                onClick={handleUpdateDelegation}
                disabled={isUpdating || !editFormData.endDate}
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button appearance="subtle" onClick={handleCloseEditDialog}>
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
