#!/usr/bin/env node
import { Console, Effect } from "effect";
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

const hello = Command.make("song-lists", { message }, (config) =>
  Console.log(`Hello, ${config.message}!`),
).pipe(
  Command.withDescription("Greet with the provided message"),
  Command.withSubcommands([echo]),
);

Effect.gen(function* () {
  yield* Console.log(banner);
  yield* Command.run(hello, { version: packageJson.version });
}).pipe(Effect.provide(NodeServices.layer), NodeRuntime.runMain);
