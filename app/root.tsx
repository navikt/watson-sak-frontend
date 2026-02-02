/**
 * Dette er entry-pointet til appen. Ta en titt på features/layout/root.tsx for mer informasjon.
 */

import { rootLoader } from "~/layout/loader.server";
import { default as RootRoute } from "~/layout/root";
import { RootErrorBoundary } from "./layout/ErrorBoundary";
import { sikkerhetHeaders } from "./sikkerhet/headers";

export default RootRoute;
export const ErrorBoundary = RootErrorBoundary;
export const headers = sikkerhetHeaders;
export const loader = rootLoader;
