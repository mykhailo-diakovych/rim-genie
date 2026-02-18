import { Layer } from "effect";
import { db } from "@rim-genie/db";
import { auth } from "@rim-genie/auth";
import { DbService, AuthService } from "./services";

export const DbLayer = Layer.succeed(DbService, db);
export const AuthLayer = Layer.succeed(AuthService, auth);
export const AppLayer = Layer.mergeAll(DbLayer, AuthLayer);
