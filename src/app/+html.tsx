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

                <ScrollViewStyleReset />
                <style dangerouslySetInnerHTML={{ __html: rootStyle }} />
            </head>
            <body>{children}</body>
        </html>
    );
}

const rootStyle = `
body {
    background-color: #ffffff;
    overscroll-behavior: none;
    -webkit-tap-highlight-color: transparent;
}
@media (prefers-color-scheme: dark) {
    body {
        background-color: #000000;
    }
}
`;
