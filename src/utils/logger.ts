/**
 * Production-safe logging utility
 * Console logs only appear in development mode
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
    /**
     * Log informational messages (development only)
     */
    log: (...args: any[]) => {
        if (isDevelopment) {
            console.log(...args);
        }
    },

    /**
     * Log debug messages (development only)
     */
    debug: (...args: any[]) => {
        if (isDevelopment) {
            console.debug(...args);
        }
    },

    /**
     * Log warning messages (always shown)
     */
    warn: (...args: any[]) => {
        console.warn(...args);
    },

    /**
     * Log error messages (always shown)
     */
    error: (...args: any[]) => {
        console.error(...args);
    },

    /**
     * Log errors with context (always shown)
     */
    errorWithContext: (message: string, error: any) => {
        console.error(message, error);
        if (isDevelopment && error?.stack) {
            console.error('Stack trace:', error.stack);
        }
    },
};
