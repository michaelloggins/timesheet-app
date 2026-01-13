/**
 * AppShell Component
 * Main application layout with horizontal navigation
 */

import { ReactNode } from 'react';
import { makeStyles, tokens, shorthands } from '@fluentui/react-components';
import { TopNavigation } from './TopNavigation';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: 'rgba(255, 255, 255, 0.75)', // Semi-transparent to show background image
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  content: {
    flex: 1,
    ...shorthands.padding(tokens.spacingVerticalXL, tokens.spacingHorizontalXL),
    ...shorthands.overflow('auto'),
    maxWidth: '1400px',
    width: '100%',
    marginLeft: 'auto',
    marginRight: 'auto',
    boxSizing: 'border-box',
    '@media (max-width: 768px)': {
      ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalM),
    },
    '@media (max-width: 480px)': {
      ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalS),
    },
  },
});

interface AppShellProps {
  children: ReactNode;
}

export const AppShell = ({ children }: AppShellProps) => {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      <TopNavigation />
      <main className={styles.main}>
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
};
