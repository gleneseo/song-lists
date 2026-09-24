import { Schema } from "effect";

/**
 * A public, stable identifier for a catalog resource.
 *
 * Every catalog table carries a `resource_id` UUID (v7) alongside its internal
 * serial primary key; apps address resources by this value, never by the serial.
 */
const ResourceId = Schema.String.pipe(
  Schema.check(Schema.isUUID()),
  Schema.brand("ResourceId"),
);

type ResourceId = Schema.Schema.Type<typeof ResourceId>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * An email address, validated shallowly enough to reject obvious mistakes
 * without pretending to implement the full RFC grammar
 */
const Email = Schema.String.pipe(
  Schema.check(Schema.isPattern(EMAIL_PATTERN)),
  Schema.brand("Email"),
);

type Email = Schema.Schema.Type<typeof Email>;

export { ResourceId, Email };
