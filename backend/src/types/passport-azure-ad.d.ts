declare module 'passport-azure-ad' {
  import { Strategy } from 'passport';

  export interface BearerStrategyOptions {
    identityMetadata: string;
    clientID: string;
    validateIssuer?: boolean;
    issuer?: string;
    audience?: string;
    passReqToCallback?: boolean;
    scope?: string[];
    loggingLevel?: string;
  }

  export class BearerStrategy extends Strategy {
    constructor(
      options: BearerStrategyOptions,
      verify: (token: any, done: (error: any, user?: any, info?: any) => void) => void
    );
  }
}
