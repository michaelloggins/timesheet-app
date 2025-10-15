import { Title2, Button, makeStyles } from '@fluentui/react-components';
import { Add24Regular } from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export const TimesheetList = () => {
  const styles = useStyles();
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title2>My Timesheets</Title2>
        <Button
          appearance="primary"
          icon={<Add24Regular />}
          onClick={() => navigate('/timesheets/new')}
        >
          New Timesheet
        </Button>
      </div>

      <p>TODO: Implement timesheet list view</p>
      <ul>
        <li>List of timesheets by week</li>
        <li>Status indicators (Draft, Submitted, Approved, Returned)</li>
        <li>Click to edit/view</li>
      </ul>
    </div>
  );
};
