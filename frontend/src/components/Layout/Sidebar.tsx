import { NavLink } from 'react-router-dom';
import { makeStyles, tokens, CounterBadge } from '@fluentui/react-components';
import {
  Home24Regular,
  ClipboardTask24Regular,
  CheckboxChecked24Regular,
  Trophy24Regular,
  DocumentTable24Regular,
  Settings24Regular,
} from '@fluentui/react-icons';
import { usePendingApprovalCount } from '../../hooks/useApprovals';

const useStyles = makeStyles({
  sidebar: {
    width: '260px',
    backgroundColor: 'white',
    borderRight: '1px solid var(--color-gray-200)',
    padding: '1rem',
    height: '100%',
    '@media (max-width: 768px)': {
      width: '280px',
      boxShadow: tokens.shadow16,
    },
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    textDecoration: 'none',
    color: 'var(--color-gray-700)',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: 'var(--color-gray-100)',
    },
    '&.active': {
      backgroundColor: 'var(--color-primary-light)',
      color: 'white',
      fontWeight: '600',
    },
  },
  navLinkContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flex: 1,
  },
  badge: {
    marginLeft: 'auto',
  },
});

interface SidebarProps {
  onNavigate?: () => void;
}

export const Sidebar = ({ onNavigate }: SidebarProps) => {
  const styles = useStyles();
  const { count: pendingCount } = usePendingApprovalCount();

  const handleNavClick = () => {
    // Close sidebar on mobile when navigating
    if (onNavigate) {
      onNavigate();
    }
  };

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav}>
        <NavLink to="/" className={styles.navLink} onClick={handleNavClick}>
          <Home24Regular />
          Dashboard
        </NavLink>
        <NavLink to="/timesheets" className={styles.navLink} onClick={handleNavClick}>
          <ClipboardTask24Regular />
          Timesheets
        </NavLink>
        <NavLink to="/approvals" className={styles.navLink} onClick={handleNavClick}>
          <span className={styles.navLinkContent}>
            <CheckboxChecked24Regular />
            Approvals
          </span>
          {pendingCount > 0 && (
            <CounterBadge
              count={pendingCount}
              color="danger"
              size="small"
              className={styles.badge}
            />
          )}
        </NavLink>
        <NavLink to="/scoreboard" className={styles.navLink} onClick={handleNavClick}>
          <Trophy24Regular />
          Scoreboard
        </NavLink>
        <NavLink to="/reports" className={styles.navLink} onClick={handleNavClick}>
          <DocumentTable24Regular />
          Reports
        </NavLink>
        <NavLink to="/admin" className={styles.navLink} onClick={handleNavClick}>
          <Settings24Regular />
          Admin
        </NavLink>
      </nav>
    </aside>
  );
};
