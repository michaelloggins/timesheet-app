import { useMsal } from '@azure/msal-react';
import { Button, Title1, Text, makeStyles } from '@fluentui/react-components';
import { loginRequest } from '../../config/authConfig';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: 'var(--color-gray-50)',
    padding: '2rem',
  },
  card: {
    backgroundColor: 'white',
    padding: '3rem',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    maxWidth: '400px',
    textAlign: 'center',
  },
  logo: {
    marginBottom: '2rem',
  },
  title: {
    marginBottom: '1rem',
    color: 'var(--color-primary)',
  },
  description: {
    marginBottom: '2rem',
    color: 'var(--color-gray-600)',
  },
  button: {
    width: '100%',
  },
});

export const LoginPage = () => {
  const { instance } = useMsal();
  const styles = useStyles();

  const handleLogin = async () => {
    try {
      await instance.loginPopup(loginRequest);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <svg width="80" height="80" viewBox="0 0 100 100">
            <path
              d="M50 10 L30 30 L30 50 L50 70 L70 50 L70 30 Z"
              fill="var(--color-primary)"
            />
            <circle cx="50" cy="50" r="15" fill="white" />
          </svg>
        </div>

        <Title1 className={styles.title}>MiraVista Timesheet</Title1>
        <Text className={styles.description}>
          Rapid Time Tracking. Accurate Results.
        </Text>

        <Button
          appearance="primary"
          size="large"
          className={styles.button}
          onClick={handleLogin}
        >
          Sign in with Microsoft
        </Button>
      </div>
    </div>
  );
};
