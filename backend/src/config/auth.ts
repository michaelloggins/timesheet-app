import dotenv from 'dotenv';
import { BearerStrategy, BearerStrategyOptions } from 'passport-azure-ad';

// Load environment variables before configuring auth strategy
dotenv.config();

export const azureAdConfig: BearerStrategyOptions = {
  identityMetadata: `https://login.microsoftonline.com/${process.env.TENANT_ID}/v2.0/.well-known/openid-configuration`,
  clientID: process.env.CLIENT_ID || '',
  audience: process.env.CLIENT_ID || '',
  validateIssuer: true,
  issuer: `https://login.microsoftonline.com/${process.env.TENANT_ID}/v2.0`,
  passReqToCallback: false,
  loggingLevel: process.env.NODE_ENV === 'development' ? 'info' : 'error',
  scope: ['User.Read'],
};

export const bearerStrategy = new BearerStrategy(
  azureAdConfig,
  (token: any, done: (err: Error | null, user?: any, info?: any) => void) => {
    if (!token) {
      return done(new Error('No token provided'));
    }

    // Token is valid, return user info
    const user = {
      entraId: token.oid,
      email: token.preferred_username || token.email,
      name: token.name,
      roles: token.roles || [],
    };

    return done(null, user, token);
  }
);

export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'your-secret-key-min-32-chars',
  expiresIn: '8h',
};
