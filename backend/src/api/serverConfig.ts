/**
 * Shared runtime config for the Express API server.
 */
export function getCorsOrigin(): string {
  return process.env.CORS_ORIGIN || 'http://localhost:5173';
}

export function getApiPort(): string {
  return process.env.PORT || process.env.HTTP_PORT || '3000';
}
