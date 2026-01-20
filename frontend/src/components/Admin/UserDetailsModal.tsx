/**
 * UserDetailsModal Component
 * Modal displaying user details from the database
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
    maxWidth: '450px',
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
  grid: {
    display: 'grid',
    gridTemplateColumns: '120px 1fr',
    rowGap: tokens.spacingVerticalS,
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
});

interface UserDetailsModalProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
}

const roleColors: Record<string, 'informative' | 'success' | 'warning' | 'important' | 'severe' | 'subtle'> = {
  Employee: 'informative',
  Manager: 'success',
  TimesheetAdmin: 'warning',
  Leadership: 'important',
  ProjectAdmin: 'severe',
  AuditReviewer: 'subtle',
};

const formatWorkWeek = (pattern?: string | null): string => {
  if (pattern === 'TuesdaySaturday') return 'Tue-Sat';
  return 'Mon-Fri';
};

export const UserDetailsModal = ({ open, onClose, user }: UserDetailsModalProps) => {
  const styles = useStyles();

  if (!user) return null;

  const formatDateTime = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
                {user.Title && (
                  <Text size={300} style={{ color: tokens.colorNeutralForeground2 }}>
                    {user.Title}
                  </Text>
                )}
              </div>
            </div>

            <Divider />

            {/* User Details Grid */}
            <div className={styles.grid} style={{ marginTop: tokens.spacingVerticalM }}>
              <span className={styles.label}>Name</span>
              <span className={styles.value}>{user.Name}</span>

              <span className={styles.label}>Title</span>
              <span className={styles.value}>{user.Title || ''}</span>

              <span className={styles.label}>Email</span>
              <span className={styles.value}>{user.Email}</span>

              <span className={styles.label}>Department</span>
              <span className={styles.value}>{user.DepartmentName || ''}</span>

              <span className={styles.label}>Manager</span>
              <span className={styles.value}>{user.ManagerName || ''}</span>

              <span className={styles.label}>Role</span>
              <span className={styles.value}>
                <Badge appearance="filled" color={roleColors[user.Role] || 'informative'} size="small">
                  {user.Role}
                </Badge>
              </span>

              <span className={styles.label}>Work Week</span>
              <span className={styles.value}>{formatWorkWeek(user.WorkWeekPattern)}</span>

              <span className={styles.label}>Last Login</span>
              <span className={styles.value}>{formatDateTime(user.LastLoginDate)}</span>

              <span className={styles.label}>Status</span>
              <span className={styles.value}>
                <Badge
                  appearance="filled"
                  color={user.IsActive ? 'success' : 'danger'}
                  size="small"
                >
                  {user.IsActive ? 'Active' : 'Inactive'}
                </Badge>
              </span>
            </div>
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
