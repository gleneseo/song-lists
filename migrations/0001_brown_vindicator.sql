CREATE SCHEMA "song_lists";
--> statement-breakpoint
ALTER TABLE "public"."artists" SET SCHEMA "song_lists";
--> statement-breakpoint
ALTER TABLE "public"."users" SET SCHEMA "song_lists";
