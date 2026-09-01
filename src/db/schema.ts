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
    integer,
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

/**
 * A person's profile picture, kept beside `user` rather than in it so that
 * reading a user never drags the bytes along.
 *
 * `id` is the whole of the addressing: it is unguessable, it is what the URL
 * carries, and replacing a picture mints a new one - which expires every
 * cached copy of the old URL without a version parameter, and stops the
 * previous picture being readable by anyone who kept the link.
 */
export const userAvatar = pgTable('user_avatar', {
    id: text('id').primaryKey(),
    userId: text('user_id')
        .notNull()
        .unique()
        .references(() => user.id, { onDelete: 'cascade' }),
    /** Base64, so that no part of this needs a binary column type. */
    data: text('data').notNull(),
    contentType: text('content_type').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});

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

/**
 * Which of a person's memberships they are currently acting in.
 *
 * A user may belong to several families, and every route resolves the family
 * from the session rather than from the request - so "which one am I in right
 * now" has to be stored somewhere the server can read. Here rather than as a
 * column on `user`, which Better Auth owns, and rather than as something the
 * client sends, which would make it the client's assertion instead of the
 * server's fact.
 *
 * A pointer at a membership that has since been soft-deleted is not an error:
 * `getMembership` falls back to the oldest live one. The cascade covers the
 * hard-delete case that a soft delete does not fire.
 */
export const activeMembership = pgTable('active_membership', {
    userId: text('user_id')
        .primaryKey()
        .references(() => user.id, { onDelete: 'cascade' }),
    familyMemberId: text('family_member_id')
        .notNull()
        .references(() => familyMember.id, { onDelete: 'cascade' }),
    updatedAt: timestamp('updated_at')
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});

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

export const subscriptionCycle = pgEnum('subscription_cycle', [
    'weekly',
    'monthly',
    'yearly',
]);

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

/**
 * A chore the family has saved. The day entries in `chore` are planned from
 * these, so a rename reaches every day the chore appears on, and a delete
 * takes those days with it.
 */
export const choreDefinition = pgTable(
    'chore_definition',
    {
        id: text('id').primaryKey(),
        familyId: text('family_id')
            .notNull()
            .references(() => family.id, { onDelete: 'cascade' }),
        name: text('name').notNull(),
        /** Null for the chores backfilled from the preset list, which nobody added. */
        createdBy: text('created_by'),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at')
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
        deletedAt: timestamp('deleted_at'),
    },
    (table) => [
        index('chore_definition_family_id_idx').on(table.familyId),
        unique('chore_definition_family_id_id_key').on(
            table.familyId,
            table.id
        ),
        foreignKey({
            columns: [table.familyId, table.createdBy],
            foreignColumns: [familyMember.familyId, familyMember.id],
            name: 'chore_definition_creator_fk',
        }),
    ]
);

export const chore = pgTable(
    'chore',
    {
        id: text('id').primaryKey(),
        familyId: text('family_id')
            .notNull()
            .references(() => family.id, { onDelete: 'cascade' }),
        definitionId: text('definition_id').notNull(),
        done: boolean('done').notNull().default(false),
        /** Off for a day the chore is not planned for, keeping its assignee. */
        active: boolean('active').notNull().default(true),
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
        foreignKey({
            columns: [table.familyId, table.definitionId],
            foreignColumns: [choreDefinition.familyId, choreDefinition.id],
            name: 'chore_definition_fk',
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
        /** When it was ticked off, which is what orders the finished list. */
        completedAt: timestamp('completed_at'),
        priority: todoPriority('priority').notNull(),
        assigneeId: text('assignee_id'),
        /** A due date, which a to-do need not have. */
        day: date('day'),
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

/**
 * A recurring payment the family keeps track of. `nextRenewal` is the single
 * date the subscription carries: the Payments screen derives its upcoming row
 * from it and moves it on by one cycle when the row is ticked off, so no
 * renewal is ever stored twice.
 */
export const subscription = pgTable(
    'subscription',
    {
        id: text('id').primaryKey(),
        familyId: text('family_id')
            .notNull()
            .references(() => family.id, { onDelete: 'cascade' }),
        name: text('name').notNull(),
        emoji: text('emoji').notNull().default(''),
        /** Minor units, so nothing is ever held as a float. */
        amount: integer('amount').notNull(),
        currency: text('currency').notNull(),
        cycle: subscriptionCycle('cycle').notNull(),
        nextRenewal: date('next_renewal').notNull(),
        /** Who pays for it, which the family need not have decided. */
        payerId: text('payer_id'),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at')
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
        deletedAt: timestamp('deleted_at'),
    },
    (table) => [
        index('subscription_family_id_idx').on(table.familyId),
        foreignKey({
            columns: [table.familyId, table.payerId],
            foreignColumns: [familyMember.familyId, familyMember.id],
            name: 'subscription_payer_fk',
        }),
    ]
);
