-- Seed users
--
-- Sample data for the song-lists demo.
--
-- The System user is the fixed-ID actor behind created_by / updated_by for rows
-- no person authored. It is its own creator, and it is not loginable (no
-- credential account).
--
-- Each other user gets a credential account so they can sign in with their seed
-- email and the shared sample password "sample-password". The emails are
-- placeholders for the real owners to change once they have signed in.
--
-- The plaintext is never stored: each password column holds Better Auth's
-- scrypt hash (`salt:key`) of "sample-password". Every user's salt is random,
-- so the hashes all differ yet all verify against that one password. To
-- change it, re-hash with `hashPassword` from `@better-auth/utils/password`
-- and replace the values below. tests/integration/postgres.test.ts signs
-- every seeded user in with "sample-password", so it fails if the two drift.
-- The account's id / issuer mirror what Better Auth writes on sign-up.

INSERT INTO "song_lists"."users" ("id", "email", "email_verified", "name", "first_name", "last_name", "role", "bio", "created_at", "updated_at", "created_by", "updated_by")
SELECT v.id::uuid, v.email, v.email_verified::boolean, v.name, v.first_name, v.last_name, v.role, v.bio, v.created_at::timestamp, v.updated_at::timestamp, v.created_by::uuid, v.updated_by::uuid
FROM (VALUES
	(0, '00000000-0000-0000-0000-000000000000', 'system@gleneseo.com', 'true', 'System', NULL, NULL, 'admin', NULL, '2026-10-19 10:02:48', '2026-10-19 10:02:48', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000')
) AS v(ord, id, email, email_verified, name, first_name, last_name, role, bio, created_at, updated_at, created_by, updated_by)
ORDER BY v.ord;

INSERT INTO "song_lists"."users" ("id", "email", "email_verified", "name", "first_name", "last_name", "role", "bio", "created_at", "updated_at", "created_by", "updated_by")
SELECT v.id::uuid, v.email, v.email_verified::boolean, v.name, v.first_name, v.last_name, v.role, v.bio, v.created_at::timestamp, v.updated_at::timestamp, v.created_by::uuid, v.updated_by::uuid
FROM (VALUES
	(0, 'ffd3684f-2cb1-4f3a-97aa-f7f24b1471ce', 'ryan@seed.gleneseo.com', 'false', 'Ryan', NULL, NULL, 'manager', NULL, '2019-08-16', '2019-08-16', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000'),
	(1, '8302ae75-1d73-40f2-9aba-817bf75eda25', 'minnz@seed.gleneseo.com', 'false', 'Minnz', NULL, NULL, 'manager', NULL, '2019-08-16', '2019-08-16', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000'),
	(2, 'a1b771ef-64a5-4baa-8def-e597e6195f59', 'cliff@seed.gleneseo.com', 'false', 'Cliff', NULL, NULL, 'manager', 'aka Dr Stank, Dr. Stank, Dr. Stankenstein, Dr. Stankleberries, MD, Bill Stank, Miguel Stank, Stank, Stank Money 5K, Stank Nasty, Stankberri3s, Stankberries, Stankleg, Stanks, Stanjob, Cliff, Cliff Claven, Mr. Cliff, MC 25ft Cliff Drop, Stankasaurus, Stan, Stan Young Cannibals, Stann Frey, Billy, Buff Dragalo, Money Mike, Dr. Jelly Finger', '2019-08-16', '2019-08-16', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000'),
	(3, 'aa99b768-2f3d-4b9e-9c2c-ffe6c8fbcb00', 'stuff@seed.gleneseo.com', 'false', 'Stuff', NULL, NULL, 'manager', 'aka Stuffy, Stiff, Smokey', '2019-08-16', '2019-08-16', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000'),
	(4, '2067c2e2-d71f-4d93-98b3-caefeefa81c1', 'al@seed.gleneseo.com', 'false', 'Al', NULL, NULL, 'admin', NULL, '2019-08-18', '2019-08-18', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000'),
	(5, '459845bc-91be-4b79-b4b2-1cc7e7f6d1ff', 'chad@seed.gleneseo.com', 'false', 'Chad', NULL, NULL, 'manager', 'aka Chaddles', '2019-08-22', '2019-08-22', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000'),
	(6, 'b7efb561-0f91-4465-a256-c261b12457c3', 'tord@seed.gleneseo.com', 'false', 'Törd', NULL, NULL, 'user', NULL, '2020-06-12', '2020-06-12', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000'),
	(7, 'ed7bf016-6ac2-44df-87c4-bcf457c71de0', 'judd@seed.gleneseo.com', 'false', 'Judd', NULL, NULL, 'user', NULL, '2024-01-19', '2024-01-19', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000'),
	(8, 'd8d385d4-6524-4164-80fa-bd7042eeae90', 'vic@seed.gleneseo.com', 'false', 'Vic', NULL, NULL, 'user', NULL, '2025-04-17', '2025-04-17', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000')
) AS v(ord, id, email, email_verified, name, first_name, last_name, role, bio, created_at, updated_at, created_by, updated_by)
ORDER BY v.ord;

INSERT INTO "song_lists"."accounts" ("account_id", "provider_id", "issuer", "password", "created_at", "updated_at", "user_id")
VALUES
	('ffd3684f-2cb1-4f3a-97aa-f7f24b1471ce', 'credential', 'local:credential', '97dc3296515500466c3d9a0c35f17ddb:f412893ccfefcef90ca9f9eb1e59776c8d75a40913bc7e0f2bdcb63178e3d34325ad10630bf32e3ad35b62c8e9ee942d5078c3542050d125b1e0106a0c477169', '2019-08-16', '2019-08-16', 'ffd3684f-2cb1-4f3a-97aa-f7f24b1471ce'),
	('8302ae75-1d73-40f2-9aba-817bf75eda25', 'credential', 'local:credential', 'bbceb90d1cc03999ee5d7eda18212ce9:7f49eee3468a1a26217dfcd8dc7602bc7fff7e6996b13cce7bc6ac4af39fcdf8270cf5015d3addb3dfafe0633ba3553e91c9a8a2803a8f661a0c94b00e51f6a9', '2019-08-16', '2019-08-16', '8302ae75-1d73-40f2-9aba-817bf75eda25'),
	('a1b771ef-64a5-4baa-8def-e597e6195f59', 'credential', 'local:credential', '731f18a7cb398e5a67533d1ca9359371:d4a04f711fc3982f4145ac59a6c120c67f9ef88f7996df5f01c10cfb1cdcacb1092851b1a9fe50b2b3e7adcf91025e94fc66050ad5d2225f2a360dd4f383bbc7', '2019-08-16', '2019-08-16', 'a1b771ef-64a5-4baa-8def-e597e6195f59'),
	('aa99b768-2f3d-4b9e-9c2c-ffe6c8fbcb00', 'credential', 'local:credential', 'cbdcd4c7261b8b8ba16a30520ba80264:39801bfe81b9157693da26cc8654990aa3bd716a943d37a9bf1733e0ab0b6324db698c19d8415007d30c75e3000491a051c3823aa5c09fa9f23a4dfce8d1b4ab', '2019-08-16', '2019-08-16', 'aa99b768-2f3d-4b9e-9c2c-ffe6c8fbcb00'),
	('2067c2e2-d71f-4d93-98b3-caefeefa81c1', 'credential', 'local:credential', '6d71cf18d9edddd23e7475b75d39ebc9:aaa15fe8d06dda854794e20fc9b2b6d96e5a047199892f3cf717a746b00cfe4db8cd40199dec41fb1cd007acd792f8556863dccf37f3d58a6a7b3de183e571c8', '2019-08-18', '2019-08-18', '2067c2e2-d71f-4d93-98b3-caefeefa81c1'),
	('459845bc-91be-4b79-b4b2-1cc7e7f6d1ff', 'credential', 'local:credential', '7e2c48493a61a8c9092bac7e92fd9f13:82cbcafc205f55b869e7642451f373c9fee3b55b805156514f94dbc21f7f36777da6412050c9231979544eb1b77f590abf58dbd1f565c4a88e7dc83b96f21eaa', '2019-08-22', '2019-08-22', '459845bc-91be-4b79-b4b2-1cc7e7f6d1ff'),
	('b7efb561-0f91-4465-a256-c261b12457c3', 'credential', 'local:credential', 'af5002e0f7761c2d30c8e7fda0d1db89:7bba8b4cbf00aac507e3b9ce1d579b59bff9758e383d62a8b2b61867745d6772ea778fb6d42461b2e799f39e7bb79fbcd94b15cfae19c2a767a8f4613945acc4', '2020-06-12', '2020-06-12', 'b7efb561-0f91-4465-a256-c261b12457c3'),
	('ed7bf016-6ac2-44df-87c4-bcf457c71de0', 'credential', 'local:credential', '97b863d630d5d1080c542cb32b7c9080:bbdcda8d3e5cd34e6029ee59e9442abe10a78281fed68acde73faeaae8cdbc4c8d127c5322f07c962c4806dd544cc94f4ae4ae344897475c65c17ca584bca3be', '2024-01-19', '2024-01-19', 'ed7bf016-6ac2-44df-87c4-bcf457c71de0'),
	('d8d385d4-6524-4164-80fa-bd7042eeae90', 'credential', 'local:credential', '3e546bec275fc1dce4bc70d43c2f47b0:7fe85d3a2c5d1652495d76d66abd13e91ae35ffb8022f1f80f0348e0b70f25c99faec869e8420a21d09af4fd2c58e0e5c273e2bf046447c3c8e2aa3dc7a17b0b', '2025-04-17', '2025-04-17', 'd8d385d4-6524-4164-80fa-bd7042eeae90');
