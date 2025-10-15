import { ReactNode } from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { TopNavigation } from './TopNavigation';
import { Sidebar } from './Sidebar';
import { useAppStore } from '../../store/useAppStore';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: tokens.colorNeutralBackground3,
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  content: {
    flex: 1,
    padding: '1.5rem',
    overflow: 'auto',
  },
});

interface AppShellProps {
  children: ReactNode;
}

export const AppShell = ({ children }: AppShellProps) => {
  const styles = useStyles();
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);

  return (
    <div className={styles.container}>
      {sidebarOpen && <Sidebar />}
      <div className={styles.main}>
        <TopNavigation />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
};
