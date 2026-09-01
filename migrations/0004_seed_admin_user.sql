-- Custom SQL migration file, put your code below! --

-- Seeds a system user to backfill the `created_by` / `updated_by` actor
-- columns for rows introduced by later seed-data migrations. Its id is a
-- fixed sentinel (rather than the usual uuidv7() default) so later
-- migrations can reference it as a literal instead of looking it up by
-- email. It is its own creator/updater since no other user precedes it.
INSERT INTO "song_lists"."users" ("id", "email", "email_verified", "name", "role", "created_by", "updated_by")
VALUES (
	'00000000-0000-0000-0000-000000000000',
	'system@gleneseo.com',
	true,
	'System',
	'admin',
	'00000000-0000-0000-0000-000000000000',
	'00000000-0000-0000-0000-000000000000'
);
