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
          <Outlet />
        </main>
      </div>
      <AppFooter />
    </div>
  );
}
