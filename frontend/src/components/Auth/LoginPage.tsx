import { useMsal } from '@azure/msal-react';
import { Button, Text, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { loginRequest } from '../../config/authConfig';
import logo from '../../assets/miravista_logo_transparent.png';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a4a14 0%, #286f1f 40%, #85b43b 100%)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    zIndex: 0,
  },
  bgShape2: {
    position: 'absolute',
    bottom: '-30%',
    left: '-15%',
    width: '500px',
    height: '500px',
    ...shorthands.borderRadius('50%'),
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    zIndex: 0,
  },
  card: {
    backgroundColor: 'white',
    ...shorthands.padding('2.5rem', '3rem'),
    ...shorthands.borderRadius('12px'),
    boxShadow: '0 25px 80px rgba(0, 0, 0, 0.25)',
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center',
    zIndex: 1,
    position: 'relative',
  },
  logo: {
    marginBottom: '1rem',
  },
  logoImage: {
    width: '220px',
    height: 'auto',
  },
  appName: {
    display: 'block',
    marginBottom: '0.5rem',
    color: '#404041',
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
  },
  tagline: {
    display: 'block',
    marginBottom: '2rem',
    color: '#666666',
    fontSize: tokens.fontSizeBase300,
  },
  button: {
    width: '100%',
    height: '48px',
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    ...shorthands.borderRadius('6px'),
    backgroundColor: '#286f1f',
    ':hover': {
      backgroundColor: '#1a4a14',
    },
  },
  footer: {
    marginTop: '2rem',
    color: '#999',
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
          <img
            src={logo}
            alt="MiraVista Diagnostics"
            className={styles.logoImage}
          />
        </div>

        <Text className={styles.appName}>Timesheet Tracking</Text>
        <Text className={styles.tagline}>
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
          Secure authentication powered by Microsoft Entra ID
        </Text>
      </div>
    </div>
  );
};
