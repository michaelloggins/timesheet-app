import { NavLink } from 'react-router-dom';
import { makeStyles } from '@fluentui/react-components';
import {
  Home24Regular,
  ClipboardTask24Regular,
  CheckboxChecked24Regular,
  Trophy24Regular,
  DocumentTable24Regular,
  Settings24Regular,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  sidebar: {
    width: '260px',
    backgroundColor: 'white',
    borderRight: '1px solid var(--color-gray-200)',
    padding: '1rem',
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
});

export const Sidebar = () => {
  const styles = useStyles();

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav}>
        <NavLink to="/" className={styles.navLink}>
          <Home24Regular />
          Dashboard
        </NavLink>
        <NavLink to="/timesheets" className={styles.navLink}>
          <ClipboardTask24Regular />
          Timesheets
        </NavLink>
        <NavLink to="/approvals" className={styles.navLink}>
          <CheckboxChecked24Regular />
          Approvals
        </NavLink>
        <NavLink to="/scoreboard" className={styles.navLink}>
          <Trophy24Regular />
          Scoreboard
        </NavLink>
        <NavLink to="/reports" className={styles.navLink}>
          <DocumentTable24Regular />
          Reports
        </NavLink>
        <NavLink to="/admin" className={styles.navLink}>
          <Settings24Regular />
          Admin
        </NavLink>
      </nav>
    </aside>
  );
};
