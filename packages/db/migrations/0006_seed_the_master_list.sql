-- Custom SQL migration file, put your code below! --

-- Creates "The Master List" as the very first list (id 1) so every other
-- list migration that follows lands after it. Its membership is populated
-- separately, once every song it needs to reference actually exists - see
-- the final migration in this series.

INSERT INTO "song_lists"."lists" ("name", "created_at", "updated_at", "created_by", "updated_by")
VALUES
	('The Master List', '2019-08-16', '2019-08-16', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000');
