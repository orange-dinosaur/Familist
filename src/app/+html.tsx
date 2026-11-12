import { ScrollViewStyleReset } from 'expo-router/html';
import React, { type PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
                />
                <title>FamiList</title>

                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-title" content="FamiList" />
                <meta
                    name="apple-mobile-web-app-status-bar-style"
                    content="black-translucent"
                />

                <link rel="manifest" href="/manifest.json" />
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

                <ScrollViewStyleReset />
                <style dangerouslySetInnerHTML={{ __html: rootStyle }} />
                <script dangerouslySetInnerHTML={{ __html: registerWorker }} />
            </head>
            <body>{children}</body>
        </html>
    );
}

/**
 * Registered only over https, which is what keeps it out of development: the
 * dev server is plain http on localhost and on the LAN, and its bundles are
 * not content-hashed, so a worker caching them would serve yesterday's code.
 */
const registerWorker = `
if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('/service-worker.js').catch(function () {});
    });
}
`;

const rootStyle = `
body {
    background-color: #F3EEE7;
    overscroll-behavior: none;
    -webkit-tap-highlight-color: transparent;
}
@media (prefers-color-scheme: dark) {
    body {
        background-color: #171B17;
    }
}
`;
