import React from 'react';

export function Test() {
    return (
        <div>
            <div>Hello</div>
            {(['a', 'b'] as const).map((x) => x)}
        </div>
    );
}
