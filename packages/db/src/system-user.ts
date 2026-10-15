/**
 * The fixed id of the bootstrap "System" user seeded by
 * `migrations/0004_seed_admin_user.sql`.
 *
 * It backfills `created_by`/`updated_by` for rows introduced by seed-data
 * migrations that have no real human actor, and consuming apps should
 * exclude it from user-facing pickers (e.g. advocates).
 */
const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

export { SYSTEM_USER_ID };
