import { FaroErrorBoundary } from "@grafana/faro-react";
import { Links, Meta, Scripts, ScrollRestoration } from "react-router";
import { AnalyticsTags } from "~/analytics/analytics";
import { PreferencesProvider } from "~/preferanser/PreferencesContext";
import { parsePreferences, type Preferences } from "~/preferanser/PreferencesCookie";
import { ThemeProvider } from "~/tema/ThemeContext";

type HtmlRammeProps = {
  children: React.ReactNode;
  initialPreferences?: Preferences;
  umamiSiteId: string;
};

const defaultPreferences: Preferences = parsePreferences(undefined);

export function HtmlRamme({
  children,
  initialPreferences = defaultPreferences,
  umamiSiteId,
}: HtmlRammeProps) {
  return (
    <html lang="nb-no">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" />
        <Meta />
        <Links />
        {umamiSiteId && <AnalyticsTags sporingId={umamiSiteId} />}
      </head>
      <body className="flex flex-col min-h-screen">
        <FaroErrorBoundary>
          <PreferencesProvider defaultPreferences={initialPreferences}>
            <ThemeProvider>{children}</ThemeProvider>
          </PreferencesProvider>
        </FaroErrorBoundary>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
