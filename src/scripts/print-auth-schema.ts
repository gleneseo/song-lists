import { getSchema } from "better-auth/db";
import { authConfig } from "../auth/config.js";

console.log(JSON.stringify(getSchema(authConfig), null, 2));
