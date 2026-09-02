CREATE TABLE "song_lists"."list_songs" (
	"id" serial PRIMARY KEY NOT NULL,
	"resource_id" uuid DEFAULT uuidv7() NOT NULL,
	"list_id" integer NOT NULL,
	"song_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL,
	CONSTRAINT "list_songs_resource_id_unique" UNIQUE("resource_id")
);
--> statement-breakpoint
CREATE TABLE "song_lists"."lists" (
	"id" serial PRIMARY KEY NOT NULL,
	"resource_id" uuid DEFAULT uuidv7() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL,
	CONSTRAINT "lists_resource_id_unique" UNIQUE("resource_id")
);
--> statement-breakpoint
CREATE TABLE "song_lists"."production_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"resource_id" uuid DEFAULT uuidv7() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL,
	CONSTRAINT "production_types_resource_id_unique" UNIQUE("resource_id")
);
--> statement-breakpoint
CREATE TABLE "song_lists"."productions" (
	"id" serial PRIMARY KEY NOT NULL,
	"resource_id" uuid DEFAULT uuidv7() NOT NULL,
	"name" text NOT NULL,
	"release_year" integer NOT NULL,
	"type_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL,
	CONSTRAINT "productions_resource_id_unique" UNIQUE("resource_id")
);
--> statement-breakpoint
CREATE TABLE "song_lists"."song_advocates" (
	"id" serial PRIMARY KEY NOT NULL,
	"resource_id" uuid DEFAULT uuidv7() NOT NULL,
	"song_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL,
	CONSTRAINT "song_advocates_resource_id_unique" UNIQUE("resource_id"),
	CONSTRAINT "song_advocates_song_id_user_id_unique" UNIQUE("song_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "song_lists"."song_covers" (
	"id" serial PRIMARY KEY NOT NULL,
	"resource_id" uuid DEFAULT uuidv7() NOT NULL,
	"song_id" integer NOT NULL,
	"original_song_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL,
	CONSTRAINT "song_covers_resource_id_unique" UNIQUE("resource_id"),
	CONSTRAINT "song_covers_song_id_original_song_id_unique" UNIQUE("song_id","original_song_id")
);
--> statement-breakpoint
CREATE TABLE "song_lists"."song_featured_artists" (
	"id" serial PRIMARY KEY NOT NULL,
	"resource_id" uuid DEFAULT uuidv7() NOT NULL,
	"song_id" integer NOT NULL,
	"artist_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL,
	CONSTRAINT "song_featured_artists_resource_id_unique" UNIQUE("resource_id"),
	CONSTRAINT "song_featured_artists_song_id_artist_id_unique" UNIQUE("song_id","artist_id")
);
--> statement-breakpoint
CREATE TABLE "song_lists"."song_productions" (
	"id" serial PRIMARY KEY NOT NULL,
	"resource_id" uuid DEFAULT uuidv7() NOT NULL,
	"song_id" integer NOT NULL,
	"production_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL,
	CONSTRAINT "song_productions_resource_id_unique" UNIQUE("resource_id"),
	CONSTRAINT "song_productions_song_id_production_id_unique" UNIQUE("song_id","production_id")
);
--> statement-breakpoint
CREATE TABLE "song_lists"."songs" (
	"id" serial PRIMARY KEY NOT NULL,
	"resource_id" uuid DEFAULT uuidv7() NOT NULL,
	"title" text NOT NULL,
	"artist_id" integer NOT NULL,
	"bio" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL,
	CONSTRAINT "songs_resource_id_unique" UNIQUE("resource_id")
);
--> statement-breakpoint
ALTER TABLE "song_lists"."list_songs" ADD CONSTRAINT "list_songs_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "song_lists"."lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."list_songs" ADD CONSTRAINT "list_songs_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "song_lists"."songs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."list_songs" ADD CONSTRAINT "list_songs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "song_lists"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."list_songs" ADD CONSTRAINT "list_songs_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "song_lists"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."lists" ADD CONSTRAINT "lists_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "song_lists"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."lists" ADD CONSTRAINT "lists_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "song_lists"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."production_types" ADD CONSTRAINT "production_types_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "song_lists"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."production_types" ADD CONSTRAINT "production_types_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "song_lists"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."productions" ADD CONSTRAINT "productions_type_id_production_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "song_lists"."production_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."productions" ADD CONSTRAINT "productions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "song_lists"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."productions" ADD CONSTRAINT "productions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "song_lists"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."song_advocates" ADD CONSTRAINT "song_advocates_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "song_lists"."songs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."song_advocates" ADD CONSTRAINT "song_advocates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "song_lists"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."song_advocates" ADD CONSTRAINT "song_advocates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "song_lists"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."song_advocates" ADD CONSTRAINT "song_advocates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "song_lists"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."song_covers" ADD CONSTRAINT "song_covers_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "song_lists"."songs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."song_covers" ADD CONSTRAINT "song_covers_original_song_id_songs_id_fk" FOREIGN KEY ("original_song_id") REFERENCES "song_lists"."songs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."song_covers" ADD CONSTRAINT "song_covers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "song_lists"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."song_covers" ADD CONSTRAINT "song_covers_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "song_lists"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."song_featured_artists" ADD CONSTRAINT "song_featured_artists_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "song_lists"."songs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."song_featured_artists" ADD CONSTRAINT "song_featured_artists_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "song_lists"."artists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."song_featured_artists" ADD CONSTRAINT "song_featured_artists_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "song_lists"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."song_featured_artists" ADD CONSTRAINT "song_featured_artists_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "song_lists"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."song_productions" ADD CONSTRAINT "song_productions_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "song_lists"."songs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."song_productions" ADD CONSTRAINT "song_productions_production_id_productions_id_fk" FOREIGN KEY ("production_id") REFERENCES "song_lists"."productions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."song_productions" ADD CONSTRAINT "song_productions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "song_lists"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."song_productions" ADD CONSTRAINT "song_productions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "song_lists"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."songs" ADD CONSTRAINT "songs_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "song_lists"."artists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."songs" ADD CONSTRAINT "songs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "song_lists"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."songs" ADD CONSTRAINT "songs_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "song_lists"."users"("id") ON DELETE no action ON UPDATE no action;