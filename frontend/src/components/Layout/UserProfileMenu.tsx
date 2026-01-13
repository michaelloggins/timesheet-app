/**
 * UserProfileMenu Component
 * User avatar with dropdown menu showing profile info and logout
 */

import { useState, useEffect, useRef } from 'react';
import { useMsal } from '@azure/msal-react';
import {
  Avatar,
  Button,
  Popover,
  PopoverTrigger,
  PopoverSurface,
  Text,
  Divider,
  makeStyles,
  tokens,
  shorthands,
  Badge,
} from '@fluentui/react-components';
import {
  SignOut24Regular,
  Mail20Regular,
  Building20Regular,
  Person20Regular,
  ChevronDown16Regular,
} from '@fluentui/react-icons';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { graphScopes } from '../../config/authConfig';
import { apiClient } from '../../services/api';

const useStyles = makeStyles({
  trigger: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalS),
    cursor: 'pointer',
    ...shorthands.padding(tokens.spacingVerticalXS, tokens.spacingHorizontalS),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    transitionProperty: 'background-color',
    transitionDuration: '150ms',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  triggerInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    '@media (max-width: 600px)': {
      display: 'none',
    },
  },
  triggerName: {
    maxWidth: '150px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  chevron: {
    color: tokens.colorNeutralForeground3,
    '@media (max-width: 600px)': {
      display: 'none',
    },
  },
  popoverSurface: {
    ...shorthands.padding(0),
    minWidth: '280px',
    maxWidth: '320px',
    ...shorthands.borderRadius(tokens.borderRadiusLarge),
    boxShadow: tokens.shadow16,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalM),
    ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalL),
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.borderRadius(tokens.borderRadiusLarge, tokens.borderRadiusLarge, 0, 0),
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXXS),
    minWidth: 0,
    flex: 1,
  },
  headerName: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  infoSection: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalS),
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL),
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalS),
    color: tokens.colorNeutralForeground2,
  },
  infoIcon: {
    color: tokens.colorNeutralForeground3,
    flexShrink: 0,
  },
  infoText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: tokens.fontSizeBase200,
  },
  footer: {
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalL, tokens.spacingVerticalM),
  },
  signOutButton: {
    width: '100%',
    justifyContent: 'flex-start',
  },
});

// Role display names and colors
const roleConfig: Record<string, { label: string; color: 'informative' | 'success' | 'warning' | 'important' }> = {
  Employee: { label: 'Employee', color: 'informative' },
  Manager: { label: 'Manager', color: 'success' },
  TimesheetAdmin: { label: 'Admin', color: 'warning' },
  Leadership: { label: 'Leadership', color: 'important' },
};

export const UserProfileMenu = () => {
  const styles = useStyles();
  const { instance, accounts } = useMsal();
  const { user } = useCurrentUser();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const syncAttempted = useRef(false);

  // Fetch user photo from backend (cached) or sync from Graph
  useEffect(() => {
    const fetchPhoto = async () => {
      if (!user?.userId) return;

      // Try to load from our backend first (fast, cached)
      try {
        const response = await apiClient.get(`/auth/avatar`, {
          responseType: 'blob',
        });
        if (response.status === 200) {
          const blob = response.data;
          setPhotoUrl(URL.createObjectURL(blob));
          return;
        }
      } catch {
        // Avatar not cached yet, continue to sync
      }

      // If no cached avatar and we haven't tried syncing yet, sync from Graph
      if (!syncAttempted.current && accounts[0]) {
        syncAttempted.current = true;

        try {
          // Get Graph token
          const tokenResponse = await instance.acquireTokenSilent({
            scopes: graphScopes.scopes,
            account: accounts[0],
          });

          // Send token to backend to sync avatar
          await apiClient.post('/auth/avatar/sync', {
            accessToken: tokenResponse.accessToken,
          });

          // Now try to load the cached avatar again
          const avatarResponse = await apiClient.get(`/auth/avatar`, {
            responseType: 'blob',
          });
          if (avatarResponse.status === 200) {
            const blob = avatarResponse.data;
            setPhotoUrl(URL.createObjectURL(blob));
          }
        } catch {
          // Photo not available, will use initials
        }
      }
    };

    fetchPhoto();

    // Cleanup blob URL on unmount
    return () => {
      if (photoUrl) {
        URL.revokeObjectURL(photoUrl);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId, accounts, instance]);

  const handleLogout = () => {
    setIsOpen(false);
    instance.logout();
  };

  if (!user) return null;

  const roleInfo = roleConfig[user.role] || roleConfig.Employee;

  return (
    <Popover
      open={isOpen}
      onOpenChange={(_, data) => setIsOpen(data.open)}
      positioning="below-end"
      trapFocus
    >
      <PopoverTrigger disableButtonEnhancement>
        <div className={styles.trigger} role="button" tabIndex={0} aria-label="User menu">
          <div className={styles.triggerInfo}>
            <Text weight="semibold" size={300} className={styles.triggerName}>
              {user.name}
            </Text>
            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
              {roleInfo.label}
            </Text>
          </div>
          <Avatar
            name={user.name}
            image={photoUrl ? { src: photoUrl } : undefined}
            size={36}
            color="brand"
          />
          <ChevronDown16Regular className={styles.chevron} />
        </div>
      </PopoverTrigger>

      <PopoverSurface className={styles.popoverSurface}>
        {/* Header with avatar and name */}
        <div className={styles.header}>
          <Avatar
            name={user.name}
            image={photoUrl ? { src: photoUrl } : undefined}
            size={56}
            color="brand"
          />
          <div className={styles.headerInfo}>
            <Text weight="semibold" size={400} className={styles.headerName}>
              {user.name}
            </Text>
            <Badge appearance="filled" color={roleInfo.color} size="small">
              {roleInfo.label}
            </Badge>
          </div>
        </div>

        {/* User info section */}
        <div className={styles.infoSection}>
          <div className={styles.infoRow}>
            <Mail20Regular className={styles.infoIcon} />
            <Text className={styles.infoText} title={user.email}>
              {user.email}
            </Text>
          </div>

          {user.departmentName && (
            <div className={styles.infoRow}>
              <Building20Regular className={styles.infoIcon} />
              <Text className={styles.infoText}>
                {user.departmentName}
              </Text>
            </div>
          )}

          {user.managerName && (
            <div className={styles.infoRow}>
              <Person20Regular className={styles.infoIcon} />
              <Text className={styles.infoText}>
                Reports to {user.managerName}
              </Text>
            </div>
          )}
        </div>

        <Divider />

        {/* Sign out button */}
        <div className={styles.footer}>
          <Button
            appearance="subtle"
            icon={<SignOut24Regular />}
            onClick={handleLogout}
            className={styles.signOutButton}
          >
            Sign out
          </Button>
        </div>
      </PopoverSurface>
    </Popover>
  );
};
