import { Title2, makeStyles } from '@fluentui/react-components';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
});

export const AdminPanel = () => {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      <Title2>Admin Panel</Title2>

      <p>TODO: Implement admin features</p>
      <ul>
        <li>Project management (CRUD)</li>
        <li>User management</li>
        <li>Department management</li>
        <li>Excel import interface</li>
        <li>System configuration</li>
        <li>Audit log viewer</li>
      </ul>
    </div>
  );
};
