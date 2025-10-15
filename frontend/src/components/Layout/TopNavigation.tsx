import { useMsal } from '@azure/msal-react';
import { Button, Avatar, Text, makeStyles } from '@fluentui/react-components';
import { SignOut24Regular, Navigation24Regular } from '@fluentui/react-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';

const useStyles = makeStyles({
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 1.5rem',
    backgroundColor: 'white',
    borderBottom: '1px solid var(--color-gray-200)',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
});

export const TopNavigation = () => {
  const { instance } = useMsal();
  const styles = useStyles();
  const user = useAuthStore((state) => state.user);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);

  const handleLogout = () => {
    instance.logout();
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.left}>
        <Button
          appearance="subtle"
          icon={<Navigation24Regular />}
          onClick={toggleSidebar}
        />
        <Text weight="semibold" size={500}>
          MiraVista Timesheet
        </Text>
      </div>

      <div className={styles.right}>
        {user && (
          <>
            <div className={styles.userInfo}>
              <Text weight="semibold">{user.name}</Text>
              <Text size={200}>{user.role}</Text>
            </div>
            <Avatar name={user.name} />
            <Button
              appearance="subtle"
              icon={<SignOut24Regular />}
              onClick={handleLogout}
            >
              Sign Out
            </Button>
          </>
        )}
      </div>
    </nav>
  );
};
