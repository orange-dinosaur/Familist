/**
 * Better Auth server instance. Server-side only.
 */

import { expo } from '@better-auth/expo';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

import { db } from '@/db';
import * as schema from '@/db/schema';
import { sendEmail } from '@/email';

export const auth = betterAuth({
    database: drizzleAdapter(db, { provider: 'pg', schema }),
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
    },
    emailVerification: {
        sendOnSignUp: true,
        sendVerificationEmail: async ({ user, url }) => {
            await sendEmail({
                to: user.email,
                subject: 'Verify your FamiList email address',
                text: `Confirm your email address to finish setting up FamiList:\n\n${url}\n\nThe link is valid for one hour. If you did not create an account, you can ignore this message.`,
            });
        },
    },
    plugins: [expo()],
    trustedOrigins: ['familist://'],
});
