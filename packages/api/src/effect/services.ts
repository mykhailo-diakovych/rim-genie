import { Context } from "effect";
import type { db } from "@rim-genie/db";
import type { auth } from "@rim-genie/auth";

export class DbService extends Context.Tag("DbService")<DbService, typeof db>() {}

export class AuthService extends Context.Tag("AuthService")<AuthService, typeof auth>() {}
