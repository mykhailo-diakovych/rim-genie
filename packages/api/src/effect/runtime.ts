import { ManagedRuntime } from "effect";
import { AppLayer } from "./layers";

export const AppRuntime = ManagedRuntime.make(AppLayer);
