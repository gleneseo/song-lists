CREATE SCHEMA "song_lists";
--> statement-breakpoint
CREATE TABLE "song_lists"."accounts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"issuer" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "accounts_issuer_account_id_unique" UNIQUE("issuer","account_id")
);
--> statement-breakpoint
CREATE TABLE "song_lists"."artists" (
	"id" serial PRIMARY KEY NOT NULL,
	"resource_id" uuid DEFAULT uuidv7() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL,
	CONSTRAINT "artists_resource_id_unique" UNIQUE("resource_id")
);
--> statement-breakpoint
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
	"extra_columns" text[] DEFAULT '{}' NOT NULL,
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
CREATE TABLE "song_lists"."sessions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
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
CREATE TABLE "song_lists"."song_metadata" (
	"id" serial PRIMARY KEY NOT NULL,
	"resource_id" uuid DEFAULT uuidv7() NOT NULL,
	"song_id" integer NOT NULL,
	"status" text NOT NULL,
	"source" text,
	"source_track_id" text,
	"artwork_url" text,
	"album_name" text,
	"release_year" integer,
	"details_matched_by" text NOT NULL,
	"artwork_matched_by" text NOT NULL,
	"fetched_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL,
	CONSTRAINT "song_metadata_resource_id_unique" UNIQUE("resource_id"),
	CONSTRAINT "song_metadata_song_id_unique" UNIQUE("song_id")
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
CREATE TABLE "song_lists"."users" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"name" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"role" text DEFAULT 'user' NOT NULL,
	"bio" text,
	"image" text,
	"deactivated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "song_lists"."verifications" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "song_lists"."accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "song_lists"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."artists" ADD CONSTRAINT "artists_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "song_lists"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."artists" ADD CONSTRAINT "artists_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "song_lists"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "song_lists"."sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "song_lists"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "song_lists"."song_metadata" ADD CONSTRAINT "song_metadata_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "song_lists"."songs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."song_metadata" ADD CONSTRAINT "song_metadata_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "song_lists"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."song_metadata" ADD CONSTRAINT "song_metadata_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "song_lists"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."song_productions" ADD CONSTRAINT "song_productions_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "song_lists"."songs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."song_productions" ADD CONSTRAINT "song_productions_production_id_productions_id_fk" FOREIGN KEY ("production_id") REFERENCES "song_lists"."productions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."song_productions" ADD CONSTRAINT "song_productions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "song_lists"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."song_productions" ADD CONSTRAINT "song_productions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "song_lists"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."songs" ADD CONSTRAINT "songs_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "song_lists"."artists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."songs" ADD CONSTRAINT "songs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "song_lists"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."songs" ADD CONSTRAINT "songs_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "song_lists"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."users" ADD CONSTRAINT "users_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "song_lists"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."users" ADD CONSTRAINT "users_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "song_lists"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_id_index" ON "song_lists"."accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_index" ON "song_lists"."sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verifications_identifier_index" ON "song_lists"."verifications" USING btree ("identifier");
CREATE TABLE "song_lists"."song_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"resource_id" uuid DEFAULT uuidv7() NOT NULL,
	"song_id" integer NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL,
	CONSTRAINT "song_notes_resource_id_unique" UNIQUE("resource_id")
);
--> statement-breakpoint
ALTER TABLE "song_lists"."song_notes" ADD CONSTRAINT "song_notes_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "song_lists"."songs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."song_notes" ADD CONSTRAINT "song_notes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "song_lists"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_lists"."song_notes" ADD CONSTRAINT "song_notes_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "song_lists"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "song_notes_song_id_idx" ON "song_lists"."song_notes" USING btree ("song_id");
