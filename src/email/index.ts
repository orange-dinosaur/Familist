/**
 * Transactional email through Resend. Server-side only.
 */

import { Resend } from 'resend';

const apiKey = process.env.EMAIL_API_KEY;
const domain = process.env.EMAIL_DOMAIN;

if (!apiKey) {
    throw new Error('EMAIL_API_KEY is not set');
}

if (!domain) {
    throw new Error('EMAIL_DOMAIN is not set');
}

const resend = new Resend(apiKey);
const from = `FamiList <noreply@${domain}>`;

/**
 * Resend reports a rejected send in the response rather than by throwing, so
 * the error is raised here instead: Better Auth swallows a failure during
 * sign-up but surfaces one from the resend-verification endpoint, and neither
 * can report what it never sees.
 */
export async function sendEmail(options: {
    to: string;
    subject: string;
    text: string;
}): Promise<void> {
    const { error } = await resend.emails.send({ from, ...options });

    if (error) {
        throw new Error(`${error.name}: ${error.message}`);
    }
}
