-- Custom SQL migration file, put your code below! --

-- Seeds tab 7 ("Best Songs About Doing It, Uh Huh-Huh"), a curated subset
-- of the existing catalog plus the one song unique to this list. That new
-- song also gets added to The Master List directly, same as this list.

INSERT INTO "song_lists"."artists" ("resource_id", "name", "created_at", "updated_at", "created_by", "updated_by")
VALUES
	('3cab17a3-18a3-448a-8519-9db6766edf72', 'The Dwarves', '2021-06-11', '2021-06-11', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000');

INSERT INTO "song_lists"."songs" ("resource_id", "title", "artist_id", "bio", "created_at", "updated_at", "created_by", "updated_by")
VALUES
	('91e12c96-bb46-4ded-9dec-9e523051d6d3', 'The Dwarves Are Still The Best Band Ever', (SELECT "id" FROM "song_lists"."artists" WHERE "name" = 'The Dwarves'), NULL, '2021-06-11', '2021-06-11', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000');

INSERT INTO "song_lists"."lists" ("name", "created_at", "updated_at", "created_by", "updated_by")
VALUES
	('Best Songs About Doing It, Uh Huh-Huh', '2021-01-08', '2021-01-08', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000');

INSERT INTO "song_lists"."list_songs" ("resource_id", "list_id", "song_id", "created_at", "updated_at", "created_by", "updated_by")
SELECT
	v.resource_id::uuid,
	(SELECT "id" FROM "song_lists"."lists" WHERE "name" = 'Best Songs About Doing It, Uh Huh-Huh'),
	s."id",
	v.added_on::timestamp,
	v.added_on::timestamp,
	u."id",
	u."id"
FROM (VALUES
	('25bf422a-8d7b-4aa8-bb9b-13a02c4657cc', '2 Live Crew', 'Me So Horny', 'Stuff', '2021-03-29'),
	('0631ee4c-3533-4a54-b570-31a73f8a3d55', 'Ant Banks', 'Late Night Fuck', 'Al', '2021-04-08'),
	('d98c2d3e-1dd0-46f5-ab71-432151eac767', 'Black Flag', 'I Don''t Care', 'Al', '2021-05-05'),
	('027a6547-5e02-4ef9-858a-1d81fa3cbe59', 'Bloodhound Gang', 'The Bad Touch', 'Stuff', '2021-02-03'),
	('63230031-08a5-4ab8-8156-6e586398c66a', 'Buckcherry', 'Crazy Bitch', 'Stuff', '2021-04-14'),
	('f4d52b14-f5f9-4bd0-8adc-5489fd1e2dea', 'Clarence Carter', 'Strokin''', 'Al', '2021-02-02'),
	('69752d84-9440-49eb-96ae-18ad4f4d943b', 'The Cramps', 'The Hot Pearl Snatch', 'Al', '2021-10-12'),
	('cfffff3f-59e8-4d39-a4a3-00a19bc6e4b6', 'DMX', 'It''s All Good', 'Al', '2021-04-20'),
	('6e8f73d9-0678-48c7-b9a6-3094003f6636', 'The Dwarves', 'The Dwarves Are Still The Best Band Ever', 'Al', '2021-06-11'),
	('4825f206-6c40-403e-a879-9f2455c260d3', 'Eazy-E', 'Gimmie That Nutt', 'Al', '2021-01-08'),
	('ccd8cefc-ff89-416c-84d4-1dca80917ef1', 'Electric Boys', 'All Lips And Hips', 'Stuff', '2021-10-04'),
	('48e430e6-d8bc-4795-a186-d602ca80d687', 'G. Love & Special Sauce', 'Kick Drum', 'Stuff', '2021-02-13'),
	('8da02386-73d2-4df3-aa9a-a71c0d703d89', 'Homeboy Sandman', 'Pussy', 'Al', '2021-01-30'),
	('b6de7917-250c-4d72-a8cf-4ffc0211aa9f', 'Inner Circle', 'Sweat (A La La La La Long)', 'Al', '2021-02-02'),
	('d311b6cb-fdb0-4301-a632-4ae9d75f2ff3', 'Jackyl', 'Down On Me', 'Al', '2021-02-14'),
	('08086985-2b59-4124-92a8-3c89f413342e', 'Juvenile', 'Back That Azz Up', 'Stuff', '2022-02-23'),
	('5b6088c5-ba98-4b2d-b702-9d8f13ed3f09', 'Khia', 'My Neck, My Back', 'Stuff', '2021-02-19'),
	('e17953d6-e988-4439-9baf-79ae3c016e0c', 'Leon Haywood', 'I Want''a Do Something Freaky To You', 'Al', '2021-02-02'),
	('d781d3bb-26e2-42b1-975f-4069782749c0', 'Limp Bizkit', 'Nookie', 'Stuff', '2021-02-12'),
	('5d62d8e0-ae5f-4327-801a-a94f1dca4039', 'LL Cool J', 'Big Ole Butt', 'Al', '2021-02-02'),
	('d2a2356f-1741-4078-95bb-7234b4a838f9', 'Mystikal', 'Pussy Crook', 'Al', '2021-02-03'),
	('8c4a91f1-1709-4ed4-9639-c6df7e4001b6', 'N2Deep', 'Back To The Hotel', 'Al', '2021-04-08'),
	('cb61c569-343a-4ac9-9f53-6ebfdbf6ce3d', 'Nerf Herder', 'Love Sandwich', 'Al', '2021-01-30'),
	('df66a20b-6f72-46ba-a546-2af91d4e587c', 'Paul Lekakis', 'Boom Boom (Let’s Go Back To My Room)', 'Al', '2021-02-25'),
	('a48e7d48-b441-4426-a455-794bb4a916b9', 'Poison', 'I Want Action', 'Minnz', '2021-01-27'),
	('6b6d5983-3874-4ef9-b982-82e3548d196c', 'Poison', 'Unskinny Bop', 'Minnz', '2021-08-10'),
	('e1ea6efe-f5ea-464d-8222-9949bac49788', 'Prince', 'Darling Nikki', 'Al', '2021-02-02'),
	('9c70e9fa-398a-487d-a3eb-a60a9cffb4ec', 'Prince', 'Feel U Up', 'Al', '2021-02-02'),
	('c527b7d6-8fa9-4c80-9724-91e8c5573596', 'Prince', 'Gett Off', 'Stancliff', '2021-02-14'),
	('83c6e779-aafa-4585-bec0-ffde531efc44', 'Prince', 'Head', 'Al', '2021-02-02'),
	('95d8d108-4487-4e5f-b640-763ae15821e7', 'Salt-N-Pepa', 'Let''s Talk About Sex', 'Stuff', '2021-04-26'),
	('b0c4eefe-d20a-4cb9-a744-6ceedf49e58f', 'Sublime', 'Caress Me Down', 'Stuff', '2021-01-30'),
	('2976f180-b086-4878-9176-438e0047188e', 'Tenacious D', 'Kielbasa', 'Al', '2021-02-24'),
	('18d3313f-b063-4c1e-aed6-c5690b96908b', 'Thundercat', 'Dragonball Durag', 'Al', '2021-02-02'),
	('de0bfa6b-9ea0-4dec-8a6f-e8cde89be556', 'A Tribe Called Quest', 'Electric Relaxation', 'Al', '2021-02-08'),
	('b5c2ef25-5525-4dd1-8763-eee66b5e141f', 'Vanity 6', 'Nasty Girl', 'Al', '2021-02-02'),
	('343e508e-b294-4d20-825c-29eb45b65209', 'Wreckx-N-Effect', 'Rump Shaker', 'Al', '2021-02-02')
) AS v(resource_id, artist_name, title, advocate_name, added_on)
JOIN "song_lists"."artists" a ON a."name" = v.artist_name
JOIN "song_lists"."songs" s ON s."artist_id" = a."id" AND s."title" = v.title
JOIN "song_lists"."users" u ON u."name" = v.advocate_name;

INSERT INTO "song_lists"."list_songs" ("resource_id", "list_id", "song_id", "created_at", "updated_at", "created_by", "updated_by")
SELECT
	v.resource_id::uuid,
	(SELECT "id" FROM "song_lists"."lists" WHERE "name" = 'The Master List'),
	s."id",
	v.added_on::timestamp,
	v.added_on::timestamp,
	u."id",
	u."id"
FROM (VALUES
	('67d743f4-59a6-4624-b9c8-f989ef8aba0c', 'The Dwarves', 'The Dwarves Are Still The Best Band Ever', 'Al', '2021-06-11')
) AS v(resource_id, artist_name, title, advocate_name, added_on)
JOIN "song_lists"."artists" a ON a."name" = v.artist_name
JOIN "song_lists"."songs" s ON s."artist_id" = a."id" AND s."title" = v.title
JOIN "song_lists"."users" u ON u."name" = v.advocate_name;
