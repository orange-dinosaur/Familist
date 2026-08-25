/**
 * Better Auth client for web. The browser keeps the session cookie and the API
 * routes are same-origin, so neither storage nor a base URL is needed.
 */

import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient();
