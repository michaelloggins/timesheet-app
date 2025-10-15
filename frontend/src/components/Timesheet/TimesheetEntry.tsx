import { Title2, makeStyles } from '@fluentui/react-components';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
});

export const TimesheetEntry = () => {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      <Title2>Timesheet Entry</Title2>

      <p>TODO: Implement timesheet entry form</p>
      <ul>
        <li>Week navigation (previous/next/current)</li>
        <li>7-day grid view (Monday-Sunday)</li>
        <li>Project selector per day</li>
        <li>Hours input (0.25 increments)</li>
        <li>Work location toggle (Office/WFH)</li>
        <li>Notes field</li>
        <li>Total hours calculation</li>
        <li>Save draft / Submit buttons</li>
        <li>Bulk entry modal</li>
      </ul>
    </div>
  );
};
