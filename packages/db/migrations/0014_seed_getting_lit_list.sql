-- Custom SQL migration file, put your code below! --

-- Seeds tab 8 ("Getting Lit"), a curated subset of the existing catalog
-- plus the handful of songs unique to this list. Those new songs also get
-- added to The Master List directly, same as this list.

INSERT INTO "song_lists"."artists" ("resource_id", "name", "created_at", "updated_at", "created_by", "updated_by")
VALUES
	('f0a64430-37a7-4b07-88ce-4db484326db5', 'Apathy', '2020-04-20', '2020-04-20', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000');

INSERT INTO "song_lists"."songs" ("resource_id", "title", "artist_id", "bio", "created_at", "updated_at", "created_by", "updated_by")
VALUES
	('333f62b1-5b9d-4b33-b281-a6f7b2cccd46', 'Smoke Weed Everyday', (SELECT "id" FROM "song_lists"."artists" WHERE "name" = 'Apathy'), NULL, '2020-04-20', '2020-04-20', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000'),
	('d6b42c6a-995d-4143-90ba-89dd62ff2eeb', 'Tripping Billies', (SELECT "id" FROM "song_lists"."artists" WHERE "name" = 'Dave Matthews Band'), NULL, '2021-03-05', '2021-03-05', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000'),
	('cbf572c6-f8f0-4924-9c64-54bb1f9c661e', 'Down 2 Tha Last Roach', (SELECT "id" FROM "song_lists"."artists" WHERE "name" = 'Eazy-E'), NULL, '2021-01-24', '2021-01-24', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000'),
	('851f6e5b-1961-486b-89f1-18bc85670200', 'My Medicine (feat. Everlast)', (SELECT "id" FROM "song_lists"."artists" WHERE "name" = 'Snoop Dogg'), NULL, '2021-04-20', '2021-04-20', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000'),
	('7c46dd5e-d290-47bb-8adc-1cb04f6da004', 'Drink Dat (feat. Wiz Khalifa)', (SELECT "id" FROM "song_lists"."artists" WHERE "name" = 'Thundercat'), NULL, '2021-02-02', '2021-02-02', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000');

UPDATE "song_lists"."songs" SET "bio" = trim(both ' ' from coalesce("bio", '') || ' ' || 'Watch the video') WHERE "artist_id" = (SELECT "id" FROM "song_lists"."artists" WHERE "name" = 'Bad Ronald') AND "title" = 'Let''s Begin' AND ("bio" IS NULL OR "bio" NOT LIKE '%' || 'Watch the video' || '%');
UPDATE "song_lists"."songs" SET "bio" = trim(both ' ' from coalesce("bio", '') || ' ' || 'Spotify Error: Not on Spotify! Ope!') WHERE "artist_id" = (SELECT "id" FROM "song_lists"."artists" WHERE "name" = 'Buckcherry') AND "title" = 'Too Drunk' AND ("bio" IS NULL OR "bio" NOT LIKE '%' || 'Spotify Error: Not on Spotify! Ope!' || '%');

INSERT INTO "song_lists"."lists" ("name", "created_at", "updated_at", "created_by", "updated_by")
VALUES
	('Getting Lit', '2020-04-20', '2020-04-20', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000');

INSERT INTO "song_lists"."list_songs" ("resource_id", "list_id", "song_id", "created_at", "updated_at", "created_by", "updated_by")
SELECT
	v.resource_id::uuid,
	(SELECT "id" FROM "song_lists"."lists" WHERE "name" = 'Getting Lit'),
	s."id",
	v.added_on::timestamp,
	v.added_on::timestamp,
	u."id",
	u."id"
FROM (VALUES
	('bf58bbeb-301b-4a76-bed5-f12dc32527c5', 'Afroman', 'Because I Got High', 'Stuff', '2021-10-28'),
	('65ae7b40-498e-400e-aba3-ad2ca98e3a92', 'Alkaline Trio', 'Little Help?', 'Al', '2021-03-10'),
	('e29089ac-4e46-457f-b771-cde90afd6faa', 'Alkaline Trio', 'My Friend Peter', 'Al', '2021-02-02'),
	('e49d5e03-5df7-482d-a6f1-676ac03e714c', 'Ant Banks', 'Roll ‘Em Phat', 'Al', '2021-03-10'),
	('6456f66d-4ebe-4a2d-bcf8-d9a6482406c0', 'Apathy', 'Smoke Weed Everyday', 'Al', '2020-04-20'),
	('7142b535-7539-4132-a2de-b95c6fc22d98', 'Bad Ronald', 'Let''s Begin', 'Stuff', '2022-02-22'),
	('60e873d4-cb1c-4d12-afea-464f3134eaf8', 'Barenaked Ladies', 'Alcohol', 'Al', '2021-02-12'),
	('57837134-be36-4ee0-a096-82aee56a5df0', 'The Beatnuts', 'Prendelo (Light It Up)', 'Al', '2021-02-24'),
	('b0907b68-073d-48b4-94d8-41a13d168b69', 'Big Bad Voodoo Daddy', 'You & Me & The Bottle Makes 3 Tonight (Baby)', 'Al', '2021-04-20'),
	('9abfcdf5-e6ea-4767-895b-90d8cf5853f4', 'Black Lips', 'Gentleman', 'Al', '2021-01-28'),
	('6a219090-8cf6-4ad3-8a6c-6a868a47b189', 'Buckcherry', 'Lit Up', 'Stuff', '2021-04-14'),
	('3ef16a4a-3f2a-4ab1-a22e-7b3fae6ac0db', 'Buckcherry', 'Too Drunk', 'Stuff', '2021-05-08'),
	('d9902da4-b5c1-4c8b-aa2d-00b1c279d060', 'Channel Live', 'Mad Izm (feat. KRS-One)', 'Al', '2021-01-24'),
	('8565c767-62da-4063-95ac-7b69f2151310', 'Chris Stapleton', 'Might As Well Get Stoned', 'Stuff', '2021-01-29'),
	('7ad424ae-ea4d-4a32-b6d8-ae093d5fade8', 'Cypress Hill', 'Hits From The Bong', 'Stuff', '2021-02-10'),
	('6e3e3fdf-18c3-4e1c-901d-9f60c97e6072', 'Cypress Hill', 'Insane In The Brain', 'Stuff', '2021-02-13'),
	('01ab7979-6780-4a8e-9a1f-1150c917d4b8', 'Cypress Hill', 'Roll It Up, Light It Up, Smoke It Up', 'Stuff', '2021-12-30'),
	('87c7c699-efff-4bdd-9d5a-c263d61b3c02', 'D12', 'Blow My Buzz', 'Al', '2021-02-08'),
	('050f84ff-95e5-4e95-937a-1d330f812e85', 'Dan Auerbach', 'Goin’ Home', 'Al', '2021-10-20'),
	('10b05aae-05a9-4eb9-8a21-d87e58c97580', 'Dave Matthews Band', 'Tripping Billies', 'Stuff', '2021-03-05'),
	('8e36ed60-b783-4fa8-9185-984ae7e56d0a', 'David Allan Coe', 'D-R-U-N-K', 'Al', '2024-11-17'),
	('a1934d39-3fff-4317-9b87-6332b061c0a5', 'David Allan Coe', 'You Never Even Called Me By My Name', 'Minnz', '2021-01-27'),
	('bda5e2e1-ed34-418c-ab18-d5583ef67c21', 'Dead Kennedys', 'Too Drunk To Fuck', 'Al', '2021-01-30'),
	('094c787f-217c-4dd2-8cfe-233f3a26391b', 'Dead To Fall', 'Major Rager', 'Al', '2021-09-01'),
	('dedd39e2-97d8-488f-bd5f-ac8eacc02257', 'The Devil Makes Three', 'Old Number Seven', 'Stuff', '2021-03-08'),
	('48d2cd4a-9d52-4ba3-adaf-aefa0d82170b', 'Dillinger', 'Cocaine In My Brain', 'Al', '2021-06-15'),
	('f9bcf18e-95b3-4254-b399-01a272bbf712', 'The Dwarves', 'The Dwarves Are Still The Best Band Ever', 'Al', '2021-06-11'),
	('a202f2e8-4f0f-477e-b368-5fbaf43e394c', 'Eazy-E', 'Down 2 Tha Last Roach', 'Al', '2021-01-24'),
	('a3513c9f-0555-4243-af0e-3629d1d725b3', 'Eric Church', 'Smoke A Little Smoke', 'Stuff', '2021-04-06'),
	('6e773519-d0e3-404e-8c39-ecff17033696', 'The Expendables', 'Bowl For Two', 'Stuff', '2022-01-11'),
	('5a064f04-2fcc-45fb-992a-5f62182da6c2', 'FIDLAR', 'By Myself', 'Al', '2022-03-17'),
	('6c38e137-3b4e-47ac-8b1c-5d282a244a99', 'Fiona Apple', 'Extraordinary Machine', 'Al', '2021-03-04'),
	('d970b22a-3825-4f5a-960c-ac6c3e513bd9', 'G. Love & Special Sauce', 'Who''s Got The Weed', 'Minnz', '2021-01-27'),
	('fe57db24-ba09-452a-b245-724168ee51b2', 'Galt McDermot', 'Coffee Cold', 'Al', '2021-02-08'),
	('88fbf127-efff-429e-8720-c5ee1e5e65c9', 'George Benson', 'Breezin’', 'Al', '2021-02-02'),
	('47cc8de5-660f-45e3-b77f-de8826204300', 'George Thorogood & The Destroyers', 'If You Don''t Start Drinkin'' (I''m Gonna Leave)', 'Al', '2021-04-20'),
	('87d3d3b4-4d86-4b60-9ac6-d6ebbc9e80e5', 'Grateful Dead', 'Brown Eyed Women', 'Minnz', '2021-01-27'),
	('d27ebad8-650f-4d48-beed-d4a659e762e7', 'The High & Mighty', 'Bart Burnt', 'Al', '2021-01-30'),
	('c3696a04-922a-494b-a2b3-d6bb47cff589', 'Hurricane', 'Get Blind', 'Al', '2022-02-11'),
	('333d9d85-ff65-454f-a1da-327ad3eebf7e', 'Ice Cube', 'It Was A Good Day', 'Al', '2021-04-20'),
	('0f29023e-0270-40f8-bb71-c05b528e213c', 'Jimmy Buffett', 'Why Don''t We Get Drunk', 'Stancliff', '2021-02-01'),
	('1c6bfe51-e543-4a72-aef4-e62bba3b5a2d', 'Luniz', 'I Got 5 On It (feat. Michael Marshall)', 'Al', '2021-01-30'),
	('39d1ff20-a7c2-49fc-919f-409842f11181', 'Municipal Waste', 'Born To Party', 'Al', '2025-06-07'),
	('f0f01613-a3d3-46f0-91c8-db87906c4d99', 'Municipal Waste', 'Ten Cent Beer Night', 'Al', '2025-06-07'),
	('cf8e512c-539a-41a4-9a42-e163dbf83865', 'NOFX', 'Drugs Are Good', 'Al', '2021-04-20'),
	('f71f393f-fbfb-465d-8a7a-7a791b25767c', 'Pat Travers', 'Snortin'' Whiskey', 'Stuff', '2021-02-13'),
	('44e4a181-531f-40e1-acd6-7ef88db9f27b', 'People Under The Stairs', 'Acid Raindrops (feat. Camel MC)', 'Al', '2021-02-02'),
	('d5cc5a79-7dec-424f-9735-241e0ac56e8e', 'People Under The Stairs', 'San Francisco Knights', 'Al', '2021-04-08'),
	('374e1511-c8b6-48e7-a324-21505a76b525', 'The Prof.', 'I Smoke (feat. Bootie Brown)', 'Al', '2021-04-20'),
	('dab1fc3e-6431-47b6-ba5a-7d0de8ea5a52', 'Sadat X', 'Reefer Madness', 'Al', '2021-01-30'),
	('3c6ed415-b4fa-4cc7-bdf5-5c8ff4bd4a9d', 'Schoolly D', 'Smoke Some Kill', 'Al', '2021-02-15'),
	('e4555e2f-8eeb-4cae-9575-e6e5ad2bed20', 'Shooter Jennings', 'D.R.U.N.K.', 'Stuff', '2021-01-29'),
	('9c50f63e-e626-4b87-a1f6-187438ef1ebd', 'Snoop Dogg', 'Gin N Juice (feat. Dat Nigga Daz)', 'Stuff', '2021-02-03'),
	('87bd7982-fae2-4b40-97d2-3c34639552cf', 'Snoop Dogg', 'My Medicine (feat. Everlast)', 'Al', '2021-04-20'),
	('d5268db3-4719-42b8-a21b-5ae680275970', 'Squeeze', 'Tempted', 'Al', '2021-02-07'),
	('0c711012-e6ea-440a-bbe5-3e5002af8833', 'Sublime', 'Get Ready', 'Stuff', '2021-03-05'),
	('3f22cac7-3ff0-4edc-8a34-cf2ea6381359', 'Sublime', 'Smoke Two Joints', 'Minnz', '2021-01-27'),
	('cb0e291e-af7d-48ee-8dc8-f58c423efd56', 'Talking Heads', 'Totally Nude', 'Al', '2021-03-04'),
	('3dccd9e2-d450-4a80-a3a1-62fa3385c99d', 'Thundercat', 'Drink Dat (feat. Wiz Khalifa)', 'Al', '2021-02-02'),
	('cb34af38-a43c-4cb8-be9a-0b8006e64f73', 'Tone Loc', 'Cheeba Cheeba', 'Stuff', '2021-03-05'),
	('45c3a938-7169-4f16-ac46-5eb79bb98e38', 'Violent Femmes', 'Don''t Start Me On The Liquor', 'Al', '2021-03-11'),
	('cbcd966b-e36a-4138-9522-b8c04b1d9e8c', 'Wynonie Harris', 'Quiet Whiskey', 'Al', '2021-01-27'),
	('635498f4-a187-4d54-96ae-4c7766a74354', 'Young Black Teenagers', 'Tap The Bottle', 'Al', '2021-04-08')
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
	('f64c748a-407a-4539-aec6-583529907932', 'Apathy', 'Smoke Weed Everyday', 'Al', '2020-04-20'),
	('db5203e7-a653-4488-b4de-7622208d57e6', 'Dave Matthews Band', 'Tripping Billies', 'Stuff', '2021-03-05'),
	('0d8399ae-0bc5-4d39-bf69-8a2036a8b143', 'Eazy-E', 'Down 2 Tha Last Roach', 'Al', '2021-01-24'),
	('25d7b9d5-9be9-4eed-a6c7-2ff85dc6e0ee', 'Snoop Dogg', 'My Medicine (feat. Everlast)', 'Al', '2021-04-20'),
	('39e0c7b9-8fc5-472f-9f8a-ffbc5b7303a5', 'Thundercat', 'Drink Dat (feat. Wiz Khalifa)', 'Al', '2021-02-02')
) AS v(resource_id, artist_name, title, advocate_name, added_on)
JOIN "song_lists"."artists" a ON a."name" = v.artist_name
JOIN "song_lists"."songs" s ON s."artist_id" = a."id" AND s."title" = v.title
JOIN "song_lists"."users" u ON u."name" = v.advocate_name;
