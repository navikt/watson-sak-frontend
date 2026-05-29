import { Page } from "@navikt/ds-react";
import { PageBlock } from "@navikt/ds-react/Page";
import { Outlet } from "react-router";
import { AppFooter } from "./AppFooter";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { InfoBanner } from "./InfoBanner";

export default function RootLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      <InfoBanner />
      <div className="flex flex-1">
        <AppSidebar />
        <main id="maincontent" className="flex-1 min-w-0">
          <Page>
            <PageBlock width="2xl" gutters className="mx-0!">
              <Outlet />
            </PageBlock>
          </Page>
        </main>
      </div>
      <AppFooter />
    </div>
  );
}
