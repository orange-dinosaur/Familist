/**
 * The lengths the content routes accept, here rather than in `@/db/content` so
 * that a screen can hold an input to the same limit: that module reaches the
 * schema and the pool, and importing it from the client would pull drizzle
 * into the bundle.
 */

export const MAX_LABEL_LENGTH = 200;

/**
 * Long enough for the sequences that render as one glyph - a family emoji is
 * eleven code units - and short enough that the column stays an emoji.
 */
export const MAX_EMOJI_LENGTH = 16;

/**
 * Long enough for the addresses people actually paste - a share link with its
 * query string - and a bound the `text` column would otherwise not have.
 */
export const MAX_URL_LENGTH = 2048;
