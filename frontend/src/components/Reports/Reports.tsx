import { Title2, makeStyles } from '@fluentui/react-components';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
});

export const Reports = () => {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      <Title2>Reports</Title2>

      <p>TODO: Implement reporting features</p>
      <ul>
        <li>Report type selector</li>
        <li>Date range picker</li>
        <li>Department filter</li>
        <li>Hours by Project report</li>
        <li>Grant-specific report</li>
        <li>Employee summary report</li>
        <li>Export to Excel button</li>
        <li>Charts and visualizations (Recharts)</li>
      </ul>
    </div>
  );
};
