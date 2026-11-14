// Run with: bun scripts/check-remote-refusals.ts
import assert from 'node:assert/strict';

declare const Bun: any;

let status = 200;
let sentFamily: string | undefined;

Bun.plugin({
    name: 'native-stubs',
    setup(build: any) {
        build.module('@/auth/client', () => ({
            exports: {
                apiFetch: async (_path: string, init: RequestInit) => {
                    sentFamily = (init.headers as Record<string, string>)[
                        'x-familist-family'
                    ];
                    return new Response(JSON.stringify({ error: 'No' }), {
                        status,
                    });
                },
            },
            loader: 'object',
        }));
    },
});

const { createRemoteClient, StoreError } =
    await import('../src/store/remote-client');
const remote = createRemoteClient({
    path: '/api/todos',
    one: 'todo',
    many: 'todos',
    familyId: 'fam-1',
});

async function failure(code: number): Promise<unknown> {
    status = code;
    try {
        await remote.update('x', {});
    } catch (error) {
        return error;
    }
    assert.fail(`${code} did not throw`);
}

for (const code of [400, 403, 404, 409]) {
    assert.ok(
        (await failure(code)) instanceof StoreError,
        `${code} should be a refusal`
    );
}

for (const code of [401, 408, 429, 500, 502, 503]) {
    assert.ok(
        !((await failure(code)) instanceof StoreError),
        `${code} should be retried`
    );
}

assert.equal(sentFamily, 'fam-1', 'every request names its family');

console.log('ok');
