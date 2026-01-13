/**
 * TopNavigation Component
 * Horizontal navigation bar with app title, nav links, and user profile
 */

import { NavLink, useLocation } from 'react-router-dom';
import { makeStyles, tokens, shorthands } from '@fluentui/react-components';
import logo from '../../assets/miravista_logo_transparent.png';
import {
  Home24Regular,
  Home24Filled,
  ClipboardTask24Regular,
  ClipboardTask24Filled,
  CheckboxChecked24Regular,
  CheckboxChecked24Filled,
  Trophy24Regular,
  Trophy24Filled,
  ChartMultiple24Regular,
  ChartMultiple24Filled,
  Settings24Regular,
  Settings24Filled,
} from '@fluentui/react-icons';
import { UserProfileMenu } from './UserProfileMenu';
import { useCurrentUser } from '../../hooks/useCurrentUser';

const useStyles = makeStyles({
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.padding(0, tokens.spacingHorizontalL),
    backgroundColor: 'white',
    borderBottom: `3px solid #85b43b`, // Brand accent stripe
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
    height: '60px',
    '@media (max-width: 768px)': {
      ...shorthands.padding(0, tokens.spacingHorizontalM),
      height: '54px',
    },
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalXL),
    '@media (max-width: 768px)': {
      ...shorthands.gap(tokens.spacingHorizontalM),
    },
  },
  appLogo: {
    height: '34px',
    '@media (max-width: 480px)': {
      height: '26px',
    },
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    height: '100%',
    ...shorthands.gap(tokens.spacingHorizontalS),
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalXS),
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    ...shorthands.borderRadius('20px'), // Pill-shaped buttons
    textDecoration: 'none',
    color: '#404041',
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    height: '38px',
    transitionProperty: 'all',
    transitionDuration: '200ms',
    transitionTimingFunction: 'ease-out',
    ':hover': {
      backgroundColor: '#e8f5e3',
      color: '#286f1f',
      transform: 'translateY(-1px)',
    },
    ':focus-visible': {
      ...shorthands.outline('2px', 'solid', '#286f1f'),
      outlineOffset: '2px',
    },
  },
  navLinkActive: {
    backgroundColor: '#286f1f',
    color: 'white',
    ':hover': {
      backgroundColor: '#1a4a14',
      color: 'white',
      transform: 'translateY(-1px)',
    },
  },
  navLinkText: {
    '@media (max-width: 900px)': {
      display: 'none',
    },
  },
  navLinkIcon: {
    fontSize: '20px',
    display: 'flex',
  },
});

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  iconActive: React.ReactNode;
  requiresManager?: boolean;
  requiresAdmin?: boolean;
}

export const TopNavigation = () => {
  const styles = useStyles();
  const location = useLocation();
  const { isManager, isAdmin } = useCurrentUser();

  const navItems: NavItem[] = [
    {
      to: '/',
      label: 'Dashboard',
      icon: <Home24Regular />,
      iconActive: <Home24Filled />,
    },
    {
      to: '/timesheets',
      label: 'Timesheets',
      icon: <ClipboardTask24Regular />,
      iconActive: <ClipboardTask24Filled />,
    },
    {
      to: '/approvals',
      label: 'Approvals',
      icon: <CheckboxChecked24Regular />,
      iconActive: <CheckboxChecked24Filled />,
      requiresManager: true,
    },
    {
      to: '/scoreboard',
      label: 'Scoreboard',
      icon: <Trophy24Regular />,
      iconActive: <Trophy24Filled />,
    },
    {
      to: '/reports',
      label: 'Reports',
      icon: <ChartMultiple24Regular />,
      iconActive: <ChartMultiple24Filled />,
      requiresManager: true,
    },
    {
      to: '/admin',
      label: 'Admin',
      icon: <Settings24Regular />,
      iconActive: <Settings24Filled />,
      requiresAdmin: true,
    },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  // Filter nav items based on user role
  const visibleNavItems = navItems.filter((item) => {
    if (item.requiresAdmin && !isAdmin) return false;
    if (item.requiresManager && !isManager) return false;
    return true;
  });

  return (
    <nav className={styles.nav}>
      <div className={styles.left}>
        {/* App Logo */}
        <img src={logo} alt="MiraVista" className={styles.appLogo} />

        {/* Navigation Links */}
        <div className={styles.navLinks}>
          {visibleNavItems.map((item) => {
            const active = isActive(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`${styles.navLink} ${active ? styles.navLinkActive : ''}`}
                title={item.label}
              >
                <span className={styles.navLinkIcon}>
                  {active ? item.iconActive : item.icon}
                </span>
                <span className={styles.navLinkText}>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* User Profile Menu */}
      <UserProfileMenu />
    </nav>
  );
};
