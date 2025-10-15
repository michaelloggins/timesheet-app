import { Title2, makeStyles } from '@fluentui/react-components';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
});

export const ApprovalsList = () => {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      <Title2>Pending Approvals</Title2>

      <p>TODO: Implement approvals list</p>
      <ul>
        <li>List of pending timesheets for approval</li>
        <li>RAG status indicators (days waiting)</li>
        <li>Employee name, week, total hours</li>
        <li>Quick approve/return actions</li>
        <li>Detail view modal with entries</li>
        <li>Tabs: Pending / Approved / Returned</li>
        <li>Department coverage tab</li>
      </ul>
    </div>
  );
};
