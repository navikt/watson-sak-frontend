import { FaroErrorBoundary } from "@grafana/faro-react";
import { Links, Meta, Scripts, ScrollRestoration } from "react-router";
import { AnalyticsTags } from "~/analytics/analytics";
import { ThemeProvider } from "~/tema/ThemeContext";
import type { Theme } from "~/tema/ThemeCookie";

type HtmlRammeProps = {
  children: React.ReactNode;
  initialTheme?: Theme;
  umamiSiteId: string;
};
export function HtmlRamme({
  children,
  initialTheme = "light",
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
          <ThemeProvider defaultTheme={initialTheme}>{children}</ThemeProvider>
        </FaroErrorBoundary>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
