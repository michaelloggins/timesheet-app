import { Title2, Card, makeStyles } from '@fluentui/react-components';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
  },
});

export const Dashboard = () => {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      <Title2>Dashboard</Title2>

      <div className={styles.grid}>
        <Card>
          <h3>Current Week Timesheet</h3>
          <p>TODO: Implement current week summary</p>
        </Card>

        <Card>
          <h3>Compliance Stats</h3>
          <p>TODO: Implement compliance metrics</p>
        </Card>

        <Card>
          <h3>Quick Actions</h3>
          <p>TODO: Implement quick entry button</p>
        </Card>

        <Card>
          <h3>Upcoming Due Dates</h3>
          <p>TODO: Implement due date reminders</p>
        </Card>
      </div>
    </div>
  );
};
