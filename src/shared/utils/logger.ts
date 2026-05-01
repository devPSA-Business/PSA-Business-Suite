import { ErrorInfo } from 'react';

export const logError = async (error: Error, errorInfo?: ErrorInfo, user: string = 'unknown') => {
  // Simple console output in place of Sentry
  console.error("APP_ERROR_LOG:", {
    user,
    error: (error instanceof Error ? error.message : String(error)),
    componentStack: errorInfo?.componentStack,
    stack: error.stack
  });
};
