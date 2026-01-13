import { useMsal } from '@azure/msal-react';
import { Button, Title1, Text, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { loginRequest } from '../../config/authConfig';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #286f1f 0%, #85b43b 50%, #e8f5e3 100%)',
    ...shorthands.padding('2rem'),
    position: 'relative',
    overflow: 'hidden',
  },
  // Decorative background shapes
  bgShape1: {
    position: 'absolute',
    top: '-20%',
    right: '-10%',
    width: '600px',
    height: '600px',
    ...shorthands.borderRadius('50%'),
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    zIndex: 0,
  },
  bgShape2: {
    position: 'absolute',
    bottom: '-30%',
    left: '-15%',
    width: '500px',
    height: '500px',
    ...shorthands.borderRadius('50%'),
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    zIndex: 0,
  },
  card: {
    backgroundColor: 'white',
    ...shorthands.padding('3rem'),
    ...shorthands.borderRadius('16px'),
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
    maxWidth: '420px',
    textAlign: 'center',
    zIndex: 1,
    position: 'relative',
  },
  logo: {
    marginBottom: '1.5rem',
  },
  title: {
    marginBottom: '0.5rem',
    color: '#286f1f',
    fontFamily: '"Roboto Condensed", sans-serif',
  },
  subtitle: {
    marginBottom: '0.25rem',
    color: '#404041',
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
  },
  description: {
    marginBottom: '2rem',
    color: '#666666',
    fontSize: tokens.fontSizeBase200,
  },
  button: {
    width: '100%',
    height: '48px',
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    ...shorthands.borderRadius('24px'),
    backgroundColor: '#286f1f',
    ':hover': {
      backgroundColor: '#1a4a14',
    },
  },
  footer: {
    marginTop: '1.5rem',
    color: '#888',
    fontSize: tokens.fontSizeBase100,
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
      {/* Decorative background shapes */}
      <div className={styles.bgShape1} />
      <div className={styles.bgShape2} />

      <div className={styles.card}>
        <div className={styles.logo}>
          <svg width="100" height="100" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="loginGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#85b43b' }} />
                <stop offset="100%" style={{ stopColor: '#286f1f' }} />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="45" fill="url(#loginGradient)" />
            <path d="M30 25 L50 50 L50 75 L55 75 L55 50 L75 25 L68 25 L52.5 45 L37 25 Z" fill="white" />
          </svg>
        </div>

        <Title1 className={styles.title}>MiraVista</Title1>
        <Text className={styles.subtitle}>Timesheet Tracking</Text>
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

        <Text className={styles.footer}>
          MiraVista Diagnostics
        </Text>
      </div>
    </div>
  );
};
