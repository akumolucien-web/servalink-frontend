const env = import.meta.env;

export const config = {
  apiBaseUrl: String(env.VITE_API_BASE_URL ?? "").replace(/\/$/, ""),
  region: String(env.VITE_AWS_REGION ?? "eu-north-1"),
  userPoolId: String(env.VITE_COGNITO_USER_POOL_ID ?? ""),
  userPoolClientId: String(env.VITE_COGNITO_USER_POOL_CLIENT_ID ?? ""),
};

/**
 * Dev-only simulated auth. All three conditions must hold, and `import.meta.env.DEV`
 * is statically false in `vite build`, so the simulated adapter is tree-shaken from
 * every production bundle (vite.config.ts also refuses to build in this mode).
 */
export const isLocalIntegration: boolean =
  import.meta.env.DEV && import.meta.env.MODE === "integration" && env.VITE_AUTH_MODE === "local";
