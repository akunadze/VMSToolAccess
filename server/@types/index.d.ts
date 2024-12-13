import session from 'express-session';

declare module 'express-session' {
    interface SessionData {
        loggedIn: boolean
    }
}
/* declare global {
    namespace session {
        interface SessionData {
            loggedIn: boolean;
        }
    }
} */
