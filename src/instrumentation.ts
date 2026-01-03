
/* eslint-disable no-console */
/**
 * Next.js Instrumentation Hook
 * 
 * Registers the logging system and ensures all transports are correctly
 * configured when the server starts. This runs in all environments.
 */

export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // We can only import server-side modules here
        const { getLoggerConfig } = await import('@/lib/logger-config');

        // Initialize config to ensure environment variables are loaded
        const config = getLoggerConfig();

        // Ensure AsyncLocalStorage is initialized by importing it (it's a side-effect of the module load)
        await import('@/lib/correlation-context');

        // In development, log that we've started
        if (process.env.NODE_ENV === 'development') {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] 🚀 Logging System Initialized: ${config.serviceName} (${config.environment})`);

            const enabledTransports = config.transports
                .filter(t => t.enabled)
                .map(t => t.name)
                .join(', ');

            console.log(`[${timestamp}] 🔌 Active Transports: ${enabledTransports}`);
        }
    }
}
