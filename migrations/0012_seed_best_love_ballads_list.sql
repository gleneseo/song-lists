-- Custom SQL migration file, put your code below! --

-- Seeds tab 6 ("Best Love Ballads"), a curated subset of the existing
-- catalog plus the one song unique to this list. That new song also gets
-- added to The Master List directly, same as this list.

INSERT INTO "song_lists"."songs" ("resource_id", "title", "artist_id", "bio", "created_at", "updated_at", "created_by", "updated_by")
VALUES
	('a27cd1d3-a63a-4d8f-92f2-567c0ef49020', 'Debra', (SELECT "id" FROM "song_lists"."artists" WHERE "name" = 'Beck'), NULL, '2021-01-29', '2021-01-29', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000');

UPDATE "song_lists"."songs" SET "bio" = trim(both ' ' from coalesce("bio", '') || ' ' || 'Aye Papi!') WHERE "artist_id" = (SELECT "id" FROM "song_lists"."artists" WHERE "name" = 'Kali Uchis') AND "title" = 'La Luz (fin)';

INSERT INTO "song_lists"."lists" ("name", "created_at", "updated_at", "created_by", "updated_by")
VALUES
	('Best Love Ballads', '2021-01-23', '2021-01-23', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000');

INSERT INTO "song_lists"."list_songs" ("resource_id", "list_id", "song_id", "created_at", "updated_at", "created_by", "updated_by")
SELECT
	v.resource_id::uuid,
	(SELECT "id" FROM "song_lists"."lists" WHERE "name" = 'Best Love Ballads'),
	s."id",
	v.added_on::timestamp,
	v.added_on::timestamp,
	u."id",
	u."id"
FROM (VALUES
	('2cc1b0f2-b7a4-463f-bcc8-d7b2bc3068e5', 'Al Green', 'La La For You', 'Al', '2021-02-02'),
	('785a15e6-1910-49dc-ab4e-726aa5585c45', 'Anderson .Paak', 'The Bird', 'Stancliff', '2021-02-01'),
	('f192901c-562f-4c70-ac2e-fc8f184d9ff2', 'Anthrax', 'N.F.B. - Dallabnikufesin', 'Al', '2021-01-30'),
	('bbf46e85-d71f-4be6-b66c-2b05c7675180', 'Beck', 'Debra', 'Stancliff', '2021-01-29'),
	('ea74fb6a-cb67-4357-a800-bfed58f092e6', 'Bee Gees', 'How Deep Is Your Love', 'Al', '2021-02-15'),
	('3b165703-c31c-4a6c-b505-ffa05ff5a5ab', 'Billy Ocean', 'Suddenly', 'Al', '2021-02-02'),
	('a97d598d-d029-4fe8-be77-95f9d65a2958', 'Bloomfield', 'Je T''Aime', 'Stancliff', '2021-02-03'),
	('d20b1ca9-e912-4b1f-ac3d-64862ca5017d', 'Bob Dylan', 'The Man In Me', 'Al', '2021-02-02'),
	('fdd0e679-e6b0-463a-8b4e-be7e46b0e4f5', 'Chet Faker', 'Gold', 'Stancliff', '2021-02-01'),
	('f6c60924-5744-4d08-9344-55102bd2a025', 'Cowboy Junkies', 'Me And The Devil Blues', 'Stancliff', '2021-02-03'),
	('2b08e779-f893-4c33-9ac4-4bca50941371', 'Daryl Hall & John Oates', 'Everytime You Go Away', 'Al', '2021-02-02'),
	('47f6b46a-0d81-4c69-849b-d8baeccfd950', 'Def Leppard', 'Love Bites', 'Stuff', '2021-02-20'),
	('59925227-973e-4849-9b05-d2b93c71cfb7', 'Elton John', 'I Guess That’s Why They Call It The Blues', 'Al', '2021-01-27'),
	('a7d93a38-2468-414f-94c3-c0fca05ab565', 'Force M.D.''s', 'Tender Love', 'Al', '2021-02-02'),
	('16a53b37-f9d3-4b77-b108-85831c6d040d', 'The Fratellis', 'Whistle For The Choir', 'Al', '2021-02-02'),
	('07e64f8c-38a0-40dc-a944-869d72a65273', 'George Michael', 'Father Figure', 'Stancliff', '2021-02-01'),
	('efc1128f-25ba-40e0-9a9e-55a31d52ec1f', 'Gregory Abbott', 'Shake You Down', 'Al', '2021-02-02'),
	('ef5db24b-5635-4609-a1c1-9e96e32da4cf', 'Harry Connick, Jr.', 'A Nightingale Sang In Berkley Square', 'Stancliff', '2021-02-03'),
	('31a4616f-2985-4576-963e-a1ae4f2898c4', 'Jeffrey Osborne', 'On The Wings Of Love', 'Al', '2021-03-01'),
	('021f90a6-7c71-45f5-9216-10e05905525b', 'Jhené Aiko', 'Wading', 'Stancliff', '2021-02-03'),
	('f53bd143-1cce-4c58-84b7-f2d53aad431b', 'Kali Uchis', 'La Luz (fin)', 'Stancliff', '2021-02-01'),
	('8fb8fc08-1692-49a8-a34f-74936c6545b2', 'Kruder & Dorfmeister', 'Original Bedroom Rockers', 'Stancliff', '2021-02-01'),
	('50a5ae9e-37bb-4f8b-a40e-20b009de239f', 'Leon Bridges', 'Beyond', 'Minnz', '2021-02-20'),
	('9e046437-3c1b-4caf-b3c5-5c1be2880b30', 'LL Cool J', 'I Need Love', 'Minnz', '2021-01-27'),
	('e031c05f-a82a-43ea-bd6d-4c2d79f80a08', 'Loggins & Messina', 'Danny''s Song', 'Al', '2021-01-23'),
	('ee6a96ae-6d55-4771-90da-e1d7484865ec', 'Mac Miller', 'Stay', 'Stancliff', '2021-01-29'),
	('3d3c4cfe-53e0-4bd6-8589-4b8afa61dbdc', 'Massive Attack', 'Black Milk', 'Stancliff', '2021-02-03'),
	('d748b85a-9d37-46b9-a88b-7cb1f083b351', 'Michael Franti & Spearhead', 'Say Hey (I Love You) (feat. Cherine Anderson)', 'Al', '2021-02-25'),
	('f126bd73-3ab0-4a3e-b5ca-a0c379af6084', 'Moby', 'Inside', 'Stancliff', '2021-02-03'),
	('29b7f9eb-9db6-4a8a-8fcc-53b544bd1460', 'Moby', 'Rushing', 'Stancliff', '2021-02-03'),
	('84634959-b7a8-4065-850c-7946b8d7eda9', 'Morphine', 'You Look Like Rain', 'Stancliff', '2021-02-01'),
	('530c1c56-7cd0-4d99-9db9-850e8008c1a9', 'Nerf Herder', 'I Want To Take You Out For Ice Cream', 'Al', '2021-01-29'),
	('7e646990-563c-4840-bda4-f71ae2c49ba8', 'NxWorries', 'Lyk Dis', 'Stancliff', '2021-02-01'),
	('a7feeee3-e941-44ca-ae4b-f4d6b66980f6', 'P.M. Dawn', 'I''d Die Without You', 'Stancliff', '2021-02-01'),
	('f9a68f52-3484-4e5e-a242-1ebf8703494b', 'Peter Gabriel', 'In Your Eyes', 'Al', '2021-02-02'),
	('39258f35-fb44-488f-8c6f-35647466b7cb', 'Phish', 'Waste', 'Al', '2021-01-29'),
	('a449acd4-9312-4c0d-b40f-d00f396366e0', 'Poison', 'Every Rose Has Its Thorn', 'Stuff', '2022-02-17'),
	('093c3062-c4b6-4c52-a404-8cadf5d82a29', 'Prince', 'Slow Love', 'Al', '2021-02-02'),
	('df23990b-61b0-4bbe-a821-2f9c20f74450', 'Rod Stewart', 'Love Touch', 'Al', '2021-02-02'),
	('4c11ec31-6a2e-44cd-8118-59aeae27122e', 'Sade', 'No Ordinary Love', 'Stancliff', '2021-02-01'),
	('0cd500ba-be13-4027-8c82-a7468838297f', 'Sam Sparro', 'Black & Gold', 'Al', '2021-01-29'),
	('f5a7cff4-9522-4e72-a6cf-f8b8ee8aef34', 'Seal', 'Violet', 'Stancliff', '2021-02-01'),
	('93961b08-04fe-4139-ad0d-d89d8ce39614', 'Soul Ballet', 'Exotique', 'Stancliff', '2021-02-03'),
	('2054b366-f80f-476d-b538-094e077f5190', 'Stevie Wonder', 'Creepin''', 'Al', '2021-02-02'),
	('8fff28f9-0326-4dd4-a6d4-a1303ee585f5', 'Stevie Wonder', 'I Love Every Little Thing About You', 'Al', '2021-02-08'),
	('63b46995-341f-4104-9902-35f10cde449e', 'Sting', 'Be Still My Beating Heart', 'Stancliff', '2021-02-03'),
	('f7cf04cb-3d94-44d8-8b49-c17a3e515c70', 'Survivor', 'The Search Is Over', 'Al', '2021-04-08'),
	('813ec4e4-bfbb-4fea-b1f0-893600b40d59', 'The System', 'Don''t Disturb This Groove', 'Minnz', '2021-07-09'),
	('e3e61750-73a3-4ca2-a4b2-614325cfd3e2', 'Thievery Corporation', 'All That We Perceive', 'Stancliff', '2021-02-01'),
	('79a8d069-9f25-4db9-b22a-e890b14a86ae', 'Tony Bennett', 'Body And Soul (feat. Amy Winehouse)', 'Stancliff', '2021-02-03'),
	('ebcfe6fb-938d-47cb-8d90-5da99f3a5d4f', 'U2', 'Slow Dancing (feat. Willie Nelson & Mickey Raphael)', 'Stancliff', '2021-02-03'),
	('ef790d05-9e85-4c17-9530-a34ef226e850', 'XTC', 'The Mayor Of Simpleton', 'Al', '2021-02-02')
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
	('e916ef91-9997-4d34-aeb2-565a5cab101c', 'Beck', 'Debra', 'Stancliff', '2021-01-29')
) AS v(resource_id, artist_name, title, advocate_name, added_on)
JOIN "song_lists"."artists" a ON a."name" = v.artist_name
JOIN "song_lists"."songs" s ON s."artist_id" = a."id" AND s."title" = v.title
JOIN "song_lists"."users" u ON u."name" = v.advocate_name;
