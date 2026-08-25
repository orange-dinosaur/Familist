/**
 * Database schema.
 *
 * Better Auth owns `user`, `session`, `account` and `verification`; the shapes
 * match what its Drizzle adapter expects. Everything under `Family` is ours.
 */

import { sql } from 'drizzle-orm';
import {
    boolean,
    check,
    date,
    foreignKey,
    index,
    pgEnum,
    pgTable,
    text,
    timestamp,
    unique,
    uniqueIndex,
} from 'drizzle-orm/pg-core';

// ─── Better Auth ────────────────────────────────────────────────────────

export const user = pgTable('user', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    image: text('image'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});

export const session = pgTable(
    'session',
    {
        id: text('id').primaryKey(),
        expiresAt: timestamp('expires_at').notNull(),
        token: text('token').notNull().unique(),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at')
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
        ipAddress: text('ip_address'),
        userAgent: text('user_agent'),
        userId: text('user_id')
            .notNull()
            .references(() => user.id, { onDelete: 'cascade' }),
    },
    (table) => [index('session_user_id_idx').on(table.userId)]
);

export const account = pgTable(
    'account',
    {
        id: text('id').primaryKey(),
        issuer: text('issuer').notNull(),
        accountId: text('account_id').notNull(),
        providerId: text('provider_id').notNull(),
        userId: text('user_id')
            .notNull()
            .references(() => user.id, { onDelete: 'cascade' }),
        accessToken: text('access_token'),
        refreshToken: text('refresh_token'),
        idToken: text('id_token'),
        accessTokenExpiresAt: timestamp('access_token_expires_at'),
        refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
        scope: text('scope'),
        password: text('password'),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at')
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [
        index('account_user_id_idx').on(table.userId),
        uniqueIndex('account_issuer_account_id_idx').on(
            table.issuer,
            table.accountId
        ),
    ]
);

export const verification = pgTable(
    'verification',
    {
        id: text('id').primaryKey(),
        identifier: text('identifier').notNull(),
        value: text('value').notNull(),
        expiresAt: timestamp('expires_at').notNull(),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at')
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [index('verification_identifier_idx').on(table.identifier)]
);

// ─── Family ─────────────────────────────────────────────────────────────

export const memberRole = pgEnum('member_role', ['owner', 'editor', 'checker']);

export const family = pgTable('family', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});

export const familyMember = pgTable(
    'family_member',
    {
        id: text('id').primaryKey(),
        familyId: text('family_id')
            .notNull()
            .references(() => family.id, { onDelete: 'cascade' }),
        name: text('name').notNull(),
        initials: text('initials').notNull(),
        /** A MemberColor token key, never a hex value. */
        color: text('color').notNull(),
        /** Null for a placeholder member, who cannot sign in. */
        userId: text('user_id').references(() => user.id, {
            onDelete: 'restrict',
        }),
        role: memberRole('role'),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at')
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
        deletedAt: timestamp('deleted_at'),
    },
    (table) => [
        index('family_member_family_id_idx').on(table.familyId),
        uniqueIndex('family_member_family_id_user_id_idx').on(
            table.familyId,
            table.userId
        ),
        unique('family_member_family_id_id_key').on(table.familyId, table.id),
        check(
            'family_member_account_has_role',
            sql`(${table.userId} is null) = (${table.role} is null)`
        ),
    ]
);

export const invitation = pgTable(
    'invitation',
    {
        id: text('id').primaryKey(),
        familyId: text('family_id')
            .notNull()
            .references(() => family.id, { onDelete: 'cascade' }),
        /** Set to promote an existing placeholder rather than add a member. */
        familyMemberId: text('family_member_id'),
        role: memberRole('role').notNull(),
        code: text('code').notNull().unique(),
        email: text('email'),
        invitedBy: text('invited_by')
            .notNull()
            .references(() => user.id, { onDelete: 'cascade' }),
        expiresAt: timestamp('expires_at').notNull(),
        acceptedAt: timestamp('accepted_at'),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at')
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [
        index('invitation_family_id_idx').on(table.familyId),
        // The target member must belong to the inviting family - a plain
        // reference to family_member.id could point across families.
        foreignKey({
            columns: [table.familyId, table.familyMemberId],
            foreignColumns: [familyMember.familyId, familyMember.id],
            name: 'invitation_family_member_fk',
        }).onDelete('cascade'),
    ]
);

// ─── Family content ─────────────────────────────────────────────────────

export const mealTime = pgEnum('meal_time', [
    'breakfast',
    'lunch',
    'snack',
    'dinner',
]);

export const todoPriority = pgEnum('todo_priority', ['low', 'medium', 'high']);

export const meal = pgTable(
    'meal',
    {
        id: text('id').primaryKey(),
        familyId: text('family_id')
            .notNull()
            .references(() => family.id, { onDelete: 'cascade' }),
        name: text('name').notNull(),
        time: mealTime('time').notNull(),
        emoji: text('emoji').notNull().default(''),
        day: date('day').notNull(),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at')
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
        deletedAt: timestamp('deleted_at'),
    },
    (table) => [index('meal_family_id_day_idx').on(table.familyId, table.day)]
);

export const chore = pgTable(
    'chore',
    {
        id: text('id').primaryKey(),
        familyId: text('family_id')
            .notNull()
            .references(() => family.id, { onDelete: 'cascade' }),
        label: text('label').notNull(),
        done: boolean('done').notNull().default(false),
        assigneeId: text('assignee_id'),
        day: date('day').notNull(),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at')
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
        deletedAt: timestamp('deleted_at'),
    },
    (table) => [
        index('chore_family_id_day_idx').on(table.familyId, table.day),
        foreignKey({
            columns: [table.familyId, table.assigneeId],
            foreignColumns: [familyMember.familyId, familyMember.id],
            name: 'chore_assignee_fk',
        }),
    ]
);

export const todo = pgTable(
    'todo',
    {
        id: text('id').primaryKey(),
        familyId: text('family_id')
            .notNull()
            .references(() => family.id, { onDelete: 'cascade' }),
        label: text('label').notNull(),
        done: boolean('done').notNull().default(false),
        priority: todoPriority('priority').notNull(),
        assigneeId: text('assignee_id'),
        day: date('day').notNull(),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at')
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
        deletedAt: timestamp('deleted_at'),
    },
    (table) => [
        index('todo_family_id_day_idx').on(table.familyId, table.day),
        foreignKey({
            columns: [table.familyId, table.assigneeId],
            foreignColumns: [familyMember.familyId, familyMember.id],
            name: 'todo_assignee_fk',
        }),
    ]
);
