#!/usr/bin/env node
import { Console, Effect, Option } from "effect";
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Argument, Command, Flag } from "effect/unstable/cli";
import packageJson from "../package.json" with { type: "json" };

const banner = `

███████╗ ██████╗ ███╗   ██╗ ██████╗       ██╗     ██╗███████╗████████╗███████╗
██╔════╝██╔═══██╗████╗  ██║██╔════╝       ██║     ██║██╔════╝╚══██╔══╝██╔════╝
███████╗██║   ██║██╔██╗ ██║██║  ███╗█████╗██║     ██║███████╗   ██║   ███████╗
╚════██║██║   ██║██║╚██╗██║██║   ██║╚════╝██║     ██║╚════██║   ██║   ╚════██║
███████║╚██████╔╝██║ ╚████║╚██████╔╝      ███████╗██║███████║   ██║   ███████║
╚══════╝ ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝       ╚══════╝╚═╝╚══════╝   ╚═╝   ╚══════╝

`;

const message = Argument.string("message");

const upper = Flag.boolean("upper").pipe(
  Flag.withAlias("u"),
  Flag.withDescription("Uppercase the echoed message"),
  Flag.withDefault(false),
);

const echo = Command.make("echo", { message, upper }, (config) =>
  Console.log(config.upper ? config.message.toUpperCase() : config.message),
).pipe(Command.withDescription("Echo back the provided message"));

const limit = Flag.integer("limit").pipe(
  Flag.withDescription("Look up no more than this many songs"),
  Flag.optional,
);

const retryNotFound = Flag.boolean("retry-not-found").pipe(
  Flag.withDescription(
    "Also look up again the songs nothing was found for (after tuning the matching)",
  ),
  Flag.withDefault(false),
);

const dryRun = Flag.boolean("dry-run").pipe(
  Flag.withDescription("Only say how many songs would be looked up"),
  Flag.withDefault(false),
);

const report = Flag.string("report").pipe(
  Flag.withDescription(
    "Write every song's lookup result to this file as CSV when the run ends",
  ),
  Flag.optional,
);

const backfillMetadata = Command.make(
  "backfill-metadata",
  { limit, retryNotFound, dryRun, report },
  (config) =>
    // Uninterruptible so that Ctrl-C (which would stop the whole program at
    // once) lets the run finish the song in hand and report; the run watches
    // for Ctrl-C itself.
    Effect.uninterruptible(
      Effect.tryPromise(async () => {
        // Loaded here rather than at the top so the other commands keep
        // working where the database packages aren't present (the Docker
        // image).
        const { runBackfillMetadata } = await import("./backfill-metadata.js");

        await runBackfillMetadata({
          limit: Option.getOrUndefined(config.limit),
          retryNotFound: config.retryNotFound,
          dryRun: config.dryRun,
          report: Option.getOrUndefined(config.report),
        });
      }),
    ),
).pipe(
  Command.withDescription(
    "Look up art and album details for the songs that have none yet",
  ),
);

const hello = Command.make("song-lists", { message }, (config) =>
  Console.log(`Hello, ${config.message}!`),
).pipe(
  Command.withDescription("Greet with the provided message"),
  Command.withSubcommands([echo, backfillMetadata]),
);

Effect.gen(function* () {
  yield* Console.log(banner);
  yield* Command.run(hello, { version: packageJson.version });
}).pipe(Effect.provide(NodeServices.layer), NodeRuntime.runMain);
