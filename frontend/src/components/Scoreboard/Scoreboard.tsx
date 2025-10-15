import { Title2, makeStyles } from '@fluentui/react-components';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem',
  },
});

export const Scoreboard = () => {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      <Title2>Department Scoreboard</Title2>

      <div className={styles.grid}>
        <div>
          <h3>Clinical Laboratory</h3>
          <p>TODO: Department completion card</p>
          <p>RAG status: Green (90%+)</p>
          <p>15/16 submitted</p>
        </div>

        <div>
          <h3>R&D</h3>
          <p>TODO: Department completion card</p>
          <p>RAG status: Amber (70-89%)</p>
          <p>10/12 submitted</p>
        </div>

        <div>
          <h3>Quality Assurance</h3>
          <p>TODO: Department completion card</p>
          <p>RAG status: Red (&lt;70%)</p>
          <p>5/10 submitted</p>
        </div>
      </div>

      <p>TODO: Implement features:</p>
      <ul>
        <li>Colorful department cards with progress circles</li>
        <li>Ranking badges (1st, 2nd, 3rd)</li>
        <li>Real-time updates</li>
        <li>Digital signage mode (full-screen)</li>
      </ul>
    </div>
  );
};
