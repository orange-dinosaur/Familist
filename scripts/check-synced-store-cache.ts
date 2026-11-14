// Run with: bun scripts/check-synced-store-cache.ts
import assert from 'node:assert/strict';

const kv = new Map<string, string>();
const stub = (exports: Record<string, unknown>) => () => ({
    exports,
    loader: 'object' as const,
});

declare const Bun: any;

Bun.plugin({
    name: 'native-stubs',
    setup(build: any) {
        build.module(
            '@/store/key-value',
            stub({
                getItem: async (k: string) => kv.get(k) ?? null,
                setItem: async (k: string, v: string) => void kv.set(k, v),
                removeItem: async (k: string) => void kv.delete(k),
                keys: async () => [...kv.keys()],
            })
        );
        build.module('@/store/heartbeat', stub({ onHeartbeat: () => () => {} }));
        build.module('@/store/reconnect', stub({ onReconnect: () => () => {} }));
        build.module('@/auth/client', stub({ apiFetch: async () => null }));
        build.module(
            '@/store/remote-client',
            stub({
                StoreError: class extends Error {},
                createRemoteClient: () => ({
                    pull: async () => [],
                    create: async (r: unknown) => r,
                    update: async () => null,
                    remove: async () => {},
                }),
            })
        );
    },
});

const { createSyncedStore, forgetSyncedStores } = await import(
    '../src/store/synced-store'
);
const { clearLocalData } = await import('../src/store/clear-local');

const make = (key: string) => createSyncedStore(key, 'todos' as never);

const a = make('familist.todos.f1');
assert.equal(make('familist.todos.f1'), a, 'same key, same store');
assert.notEqual(make('familist.todos.f2'), a, 'other key, other store');

forgetSyncedStores();
assert.notEqual(make('familist.todos.f1'), a, 'new store after the reset');

const b = make('familist.todos.f1');
await clearLocalData();
assert.notEqual(make('familist.todos.f1'), b, 'sign-out drops the stores');

const { createLocalStore } = await import('../src/store/local-store');
const local = createLocalStore<{ id: string }>('familist.peek.f1');
assert.equal(local.peek(), null, 'nothing to peek before the first read');
assert.deepEqual(await local.list(), []);
assert.deepEqual(local.peek(), [], 'peek answers once the read is done');
await local.create({});
assert.equal(local.peek()?.length, 1, 'peek follows writes');

console.log('ok');
