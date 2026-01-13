/**
 * UserDetailsModal Component
 * Modal displaying full user details from the database
 */

import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
  Button,
  makeStyles,
  tokens,
  Badge,
  Avatar,
  Divider,
  Text,
} from '@fluentui/react-components';
import { Dismiss24Regular } from '@fluentui/react-icons';
import { User } from '../../hooks/useUsers';

const useStyles = makeStyles({
  surface: {
    maxWidth: '500px',
    width: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalL,
    marginBottom: tokens.spacingVerticalL,
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  section: {
    marginBottom: tokens.spacingVerticalM,
  },
  sectionTitle: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: tokens.spacingVerticalS,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '140px 1fr',
    gap: tokens.spacingVerticalS,
    rowGap: tokens.spacingVerticalXS,
  },
  label: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  value: {
    fontSize: tokens.fontSizeBase300,
    wordBreak: 'break-word',
  },
  statusBadge: {
    marginLeft: tokens.spacingHorizontalS,
  },
  deactivationInfo: {
    backgroundColor: tokens.colorPaletteRedBackground1,
    padding: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusMedium,
    marginTop: tokens.spacingVerticalS,
  },
});

interface UserDetailsModalProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
}

const roleColors: Record<string, 'informative' | 'success' | 'warning' | 'important'> = {
  Employee: 'informative',
  Manager: 'success',
  TimesheetAdmin: 'warning',
  Leadership: 'important',
};

export const UserDetailsModal = ({ open, onClose, user }: UserDetailsModalProps) => {
  const styles = useStyles();

  if (!user) return null;

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateOnly = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface className={styles.surface}>
        <DialogTitle
          action={
            <Button
              appearance="subtle"
              icon={<Dismiss24Regular />}
              onClick={onClose}
              aria-label="Close"
            />
          }
        >
          User Details
        </DialogTitle>

        <DialogBody>
          <DialogContent>
            {/* Header with avatar and name */}
            <div className={styles.header}>
              <Avatar name={user.Name} size={64} color="brand" />
              <div className={styles.headerInfo}>
                <Text size={500} weight="semibold">{user.Name}</Text>
                <div>
                  <Badge appearance="filled" color={roleColors[user.Role] || 'informative'}>
                    {user.Role}
                  </Badge>
                  <Badge
                    appearance="filled"
                    color={user.IsActive ? 'success' : 'danger'}
                    className={styles.statusBadge}
                  >
                    {user.IsActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>

            <Divider />

            {/* Contact Information */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Contact Information</div>
              <div className={styles.grid}>
                <span className={styles.label}>Email</span>
                <span className={styles.value}>{user.Email}</span>

                {user.EmployeeID && (
                  <>
                    <span className={styles.label}>Employee ID</span>
                    <span className={styles.value}>{user.EmployeeID}</span>
                  </>
                )}
              </div>
            </div>

            {/* Organization */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Organization</div>
              <div className={styles.grid}>
                <span className={styles.label}>Department</span>
                <span className={styles.value}>{user.DepartmentName || '-'}</span>

                <span className={styles.label}>Manager</span>
                <span className={styles.value}>{user.ManagerName || '-'}</span>

                {user.ManagerEmail && (
                  <>
                    <span className={styles.label}>Manager Email</span>
                    <span className={styles.value}>{user.ManagerEmail}</span>
                  </>
                )}
              </div>
            </div>

            {/* System Information */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>System Information</div>
              <div className={styles.grid}>
                <span className={styles.label}>User ID</span>
                <span className={styles.value}>{user.UserID}</span>

                <span className={styles.label}>Entra ID</span>
                <span className={styles.value} style={{ fontSize: tokens.fontSizeBase100 }}>
                  {user.EntraIDObjectID}
                </span>

                <span className={styles.label}>Created</span>
                <span className={styles.value}>{formatDateOnly(user.CreatedDate)}</span>

                <span className={styles.label}>Last Login</span>
                <span className={styles.value}>{formatDate(user.LastLoginDate)}</span>
              </div>
            </div>

            {/* Deactivation Info (if inactive) */}
            {!user.IsActive && user.DeactivatedDate && (
              <div className={styles.deactivationInfo}>
                <div className={styles.sectionTitle} style={{ color: tokens.colorPaletteRedForeground1 }}>
                  Deactivation Information
                </div>
                <div className={styles.grid}>
                  <span className={styles.label}>Deactivated</span>
                  <span className={styles.value}>{formatDate(user.DeactivatedDate)}</span>

                  {user.DeactivationReason && (
                    <>
                      <span className={styles.label}>Reason</span>
                      <span className={styles.value}>{user.DeactivationReason}</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </DialogBody>

        <DialogActions>
          <Button appearance="secondary" onClick={onClose}>
            Close
          </Button>
        </DialogActions>
      </DialogSurface>
    </Dialog>
  );
};
