-- Custom SQL migration file, put your code below! --

-- Seeds tab 5 ("Best Workout Yams"), a curated subset of the existing
-- catalog plus the handful of songs unique to this list. Songs new to the
-- catalog here also get added to The Master List directly (created back in
-- 0006), same as this list - its other, already-catalogued songs joined
-- The Master List back in 0010 when they first entered the catalog.

INSERT INTO "song_lists"."artists" ("resource_id", "name", "created_at", "updated_at", "created_by", "updated_by")
VALUES
	('a6bce4bb-69d5-432c-8f23-21fc210c58d2', 'Anthrax & Public Enemy', '2021-02-01', '2021-02-01', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000');

INSERT INTO "song_lists"."songs" ("resource_id", "title", "artist_id", "bio", "created_at", "updated_at", "created_by", "updated_by")
VALUES
	('03260266-0664-4010-8786-be27f6ca1ae4', 'Bring Tha Noize', (SELECT "id" FROM "song_lists"."artists" WHERE "name" = 'Anthrax & Public Enemy'), NULL, '2021-02-01', '2021-02-01', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000'),
	('365982b3-10f8-4d82-aad7-f434d755bd1e', 'Off The Books (feat. Big Punisher & Cuban Link)', (SELECT "id" FROM "song_lists"."artists" WHERE "name" = 'The Beatnuts'), NULL, '2021-02-24', '2021-02-24', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000');

UPDATE "song_lists"."songs" SET "bio" = trim(both ' ' from coalesce("bio", '') || ' ' || 'ARE YOU TALKING TO ME?') WHERE "artist_id" = (SELECT "id" FROM "song_lists"."artists" WHERE "name" = 'Pantera') AND "title" = 'Walk';

INSERT INTO "song_lists"."lists" ("name", "created_at", "updated_at", "created_by", "updated_by")
VALUES
	('Best Workout Yams', '2021-01-22', '2021-01-22', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000');

INSERT INTO "song_lists"."list_songs" ("resource_id", "list_id", "song_id", "created_at", "updated_at", "created_by", "updated_by")
SELECT
	v.resource_id::uuid,
	(SELECT "id" FROM "song_lists"."lists" WHERE "name" = 'Best Workout Yams'),
	s."id",
	v.added_on::timestamp,
	v.added_on::timestamp,
	u."id",
	u."id"
FROM (VALUES
	('2d0a0e47-b5c6-4cc3-914b-de7cc86a1fd8', 'AC/DC', 'If You Want Blood (You''ve Got It)', 'Al', '2021-02-03'),
	('db048571-460f-4818-b985-8be2c6347f47', 'AC/DC', 'Let There Be Rock', 'Al', '2021-02-03'),
	('41423c85-5d32-4802-b35b-523a27de7ef8', 'AC/DC', 'Who Made Who', 'Stuff', '2021-02-03'),
	('65d331f1-27a1-4ede-83c9-c367dc64b6d7', 'Andrew W.K.', 'Party Hard', 'Al', '2021-04-20'),
	('6d7c2e38-b9da-4213-9d51-48c7b7f945f4', 'Anthrax & Public Enemy', 'Bring Tha Noize', 'Stuff', '2021-02-01'),
	('f04d19fd-9a1f-4033-af3b-c2961fd9a0e3', 'Babes In Toyland', 'Sweet ''69', 'Al', '2021-02-01'),
	('f03c124e-f2aa-43c5-99f0-3a56c93bafda', 'The Beatnuts', 'Off The Books (feat. Big Punisher & Cuban Link)', 'Al', '2021-02-24'),
	('fbe98eaa-3ba6-446e-a44e-8e94ca7aea5c', 'The Beatnuts', 'Watch Out Now', 'Al', '2021-02-09'),
	('9f632ef4-1c56-4a68-9e09-f34bf6d96b68', 'Black Flag', 'I Don''t Care', 'Al', '2021-05-05'),
	('57a8ca69-6819-4154-a499-ff0b04e0f458', 'Channel Live', 'Mad Izm (feat. KRS-One)', 'Al', '2021-01-24'),
	('3b43920a-dcd7-4441-8c9a-e4c01ccb955c', 'Chromeo', 'You''re So Gangsta', 'Al', '2021-02-07'),
	('02f3b26b-db35-4848-b5cf-da8881368483', 'Chubb Rock', 'Treat ‘Em Right', 'Al', '2021-01-24'),
	('3fd05471-9232-4334-b32d-79381de78bde', 'Descendents', 'Suburban Home', 'Al', '2021-04-20'),
	('cf5ae7f1-4bf7-405b-8236-0b863e5fd852', 'Dope', 'Die MF Die', 'Minnz', '2021-03-29'),
	('72cc1faa-1878-410b-9e52-d04987306548', 'Drowning Pool', 'Bodies', 'Al', '2021-06-11'),
	('fcfd3412-0175-4190-9d58-e692c7d50248', 'Earth Wind & Fire', 'Boogie Wonderland', 'Al', '2021-02-09'),
	('8ea3c1f9-a10e-4c01-9af7-d3aa083d6781', 'Eminem', 'Lose Yourself', 'Stuff', '2021-03-05'),
	('b4664b7c-33e2-4951-8fc4-ab8c85e7da60', 'Franz Ferdinand', 'Evil Eye', 'Al', '2021-04-08'),
	('c22307e5-5d22-4fbc-9066-55a163153cab', 'Gogol Bordello', '60 Revolutions', 'Al', '2021-02-09'),
	('5cd39e15-77f2-4fc8-b299-b555e22c7e11', 'Head East', 'Never Been Any Reason', 'Al', '2021-02-11'),
	('2c448d44-9a52-4619-87c6-599f95b7f922', 'Incredible Bongo Band', 'Apache', 'Al', '2021-02-11'),
	('547ec9e2-7ad9-4cc8-8265-79299b0c2ad4', 'Jackyl', 'Down On Me', 'Al', '2021-03-30'),
	('3a68a5f8-1fc8-4231-997c-dd037886a46a', 'Joan Jett & The Blackhearts', 'Bad Reputation', 'Al', '2021-03-30'),
	('8cce9c0c-4703-4789-8f0c-16707eb1c768', 'John Cafferty', 'Hearts On Fire', 'Stuff', '2021-01-22'),
	('1928f68c-1b67-4b22-a955-87bbb2ab9d3e', 'John Mellencamp', 'Authority Song', 'Al', '2021-02-24'),
	('784c4db6-6a23-41fe-9a71-57231011c8a7', 'KMFDM', 'A Drug Against War', 'Al', '2021-01-30'),
	('9cf4433b-1eec-403d-a75e-3f9aad36b9e0', 'Led Zeppelin', 'Wearing And Tearing', 'Al', '2021-02-22'),
	('4b835f63-6733-4713-9c32-e311c5edd398', 'Limp Bizkit', 'Break Stuff', 'Stuff', '2021-02-18'),
	('c4478717-74aa-4559-a0fe-9cf30ea9c37b', 'Luke', 'Breakdown', 'Al', '2021-03-30'),
	('9bd8a0c2-7754-4f3c-9ede-425dcd048ccd', 'Major Lazer', 'Pon De Floor (feat. Vybz Kartel)', 'Al', '2021-02-03'),
	('59e91855-cef6-4b73-a73d-170411e78b9d', 'MC Serch', 'Back To The Grill (feat. Chubb Rock, Red Hot Lover Tone and Nasty Nas)', 'Al', '2021-04-02'),
	('01f51a82-706e-492f-a28f-1a4cad5a1eb3', 'Metallica', 'Master Of Puppets', 'Minnz', '2021-01-27'),
	('d97e5f5c-b641-4a94-966b-319055eee2fd', 'Metallica', 'Whiplash', 'Stuff', '2021-08-20'),
	('b47018b4-0952-4933-8f28-30967ad74b49', 'Metallica', 'Seek & Destroy', 'Stuff', '2021-01-29'),
	('4ac7f7b3-fcfd-43b2-8c0b-3fb7955d971c', 'Miles Davis', 'What It Is', 'Al', '2021-01-24'),
	('306e929d-c3fc-45bd-b737-0b0b9cddf4bc', 'Ministry', 'Let’s Go', 'Al', '2021-02-03'),
	('7eec6766-7756-4590-b1ec-4c7e3b2d918b', 'Ministry', 'N.W.O.', 'Al', '2021-02-09'),
	('f6f91c85-22aa-491f-aee5-292c6e173d23', 'Nonpoint', 'Bullet With A Name', 'Stuff', '2021-03-01'),
	('1a710dc6-801b-4169-aeff-8b522c658c28', 'Operation Ivy', 'Sound System', 'Al', '2021-02-09'),
	('cb7ad97a-ba18-48c2-a3d9-60e063d5f830', 'P.O.S', 'Half-Cocked Concepts', 'Al', '2021-02-07'),
	('72ac9e02-d280-4c5d-8938-58984fc3a4a0', 'Pantera', '5 Minutes Alone', 'Minnz', '2021-03-29'),
	('7cf4853c-fe87-4b62-a392-a9ff7f3534d6', 'Pantera', 'A New Level', 'Stuff', '2021-01-29'),
	('ce8e0f83-f49b-4fd0-8b6a-82e6342c5ca4', 'Pantera', 'Walk', 'Minnz', '2021-01-27'),
	('2baeb22f-375b-4aab-b0b2-772a008bbcd6', 'Pharoahe Monch', 'Right Here', 'Al', '2021-02-15'),
	('a3823413-43be-4b4a-b5d2-fe8787523af4', 'Primal Scream', 'Rocks', 'Al', '2021-04-08'),
	('fbf1eab2-51c0-4783-8a06-0a20b197a903', 'Prong', 'Snap Your Fingers, Snap Your Neck', 'Al', '2021-03-30'),
	('59b3b408-0ead-4a81-9220-05dfabb7af1e', 'Queen', 'Tie Your Mother Down', 'Al', '2021-04-08'),
	('9c76af44-5419-4f42-aa13-57f095b450c4', 'Rage Against The Machine', 'Bombtrack', 'Stuff', '2021-01-29'),
	('bccbcd57-7ea4-4b74-9f8a-478ca625a341', 'Rage Against The Machine', 'Vietnow', 'Al', '2021-04-08'),
	('19ee35f0-46e0-4cba-b033-ab59a3deee71', 'Redman', '80 Barz', 'Al', '2021-09-14'),
	('4839bb08-09f2-4b26-84fb-99037af0df60', 'Run-D.M.C.', 'Peter Piper', 'Al', '2021-01-27'),
	('ec3a03c5-e2f2-42e1-ba14-c855ab74c80b', 'Sick Puppies', 'You''re Going Down', 'Stuff', '2021-03-01'),
	('8b64e920-3b1a-47ee-8bee-f97b3865704e', 'Slayer', 'Raining Blood', 'Minnz', '2021-01-27'),
	('955b2a75-e64f-46f0-a8e0-257f3970c7c1', 'Slipknot', 'All Out Life', 'Stuff', '2021-03-05'),
	('e3eacf79-553b-4839-9b9f-43ad549bb9b7', 'Slipknot', 'Duality', 'Minnz', '2021-01-27'),
	('a847adaf-9c51-4d67-a9e6-5192b5d909b3', 'Soundgarden', 'Outshined', 'Minnz', '2021-03-29'),
	('66625623-25dc-44d9-9823-186fc3e05730', 'Suicidal Tendencies', 'Possessed To Skate', 'Al', '2021-05-21'),
	('10ec4b11-b2f8-45e7-8e99-dbfbb1d3b782', 'Survivor', 'Eye Of The Tiger', 'Stuff', '2021-03-01'),
	('fa8df4c1-3ef4-49d7-8cbc-65cc8b9e5bc7', 'System Of A Down', 'Chop Suey!', 'Minnz', '2021-01-27'),
	('6619678e-8517-4c86-a54c-a6a33b382eb2', 'Talking Heads', 'Making Flippy Floppy', 'Al', '2021-02-03'),
	('3552269f-80ce-4131-b4bc-17c1138f63b2', 'Valentino Khan', 'Pony', 'Al', '2021-02-03'),
	('5efd620d-ce18-4d5d-b838-c0a42c156d8b', 'Van Halen', 'Dreams', 'Al', '2021-01-24'),
	('89687723-69f7-47a7-a88f-e30888dd8515', 'White Zombie', 'Super Charger Heaven', 'Minnz', '2021-03-29'),
	('17218f2a-9fd6-4d40-bbf5-074497bff282', 'The Whole Darn Family', 'Seven Minutes Of Funk', 'Al', '2021-01-29'),
	('38eb825a-b22e-4c5b-b344-2808fbce2a59', 'Wilson Pickett', 'Land Of 1000 Dances', 'Al', '2022-03-09'),
	('d9cec892-c1c5-47c1-be14-7cf26717e255', 'Eric B. & Rakim', 'I Ain''t No Joke', 'Al', '2022-10-27')
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
	('d61a0c49-944e-421a-bf21-23a0ba17b976', 'Anthrax & Public Enemy', 'Bring Tha Noize', 'Stuff', '2021-02-01'),
	('b30c22df-d74f-43a2-951e-afa31103b131', 'The Beatnuts', 'Off The Books (feat. Big Punisher & Cuban Link)', 'Al', '2021-02-24')
) AS v(resource_id, artist_name, title, advocate_name, added_on)
JOIN "song_lists"."artists" a ON a."name" = v.artist_name
JOIN "song_lists"."songs" s ON s."artist_id" = a."id" AND s."title" = v.title
JOIN "song_lists"."users" u ON u."name" = v.advocate_name;
