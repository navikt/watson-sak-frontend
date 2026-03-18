import {
  BarChartIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FolderIcon,
  HouseIcon,
  PlusCircleIcon,
  TasklistIcon,
} from "@navikt/aksel-icons";
import { Tooltip } from "@navikt/ds-react";
import { type ComponentType, useEffect, useState } from "react";
import { NavLink } from "react-router";
import { usePreferences } from "~/preferanser/PreferencesContext";
import { RouteConfig } from "~/routeConfig";

type Lenke = {
  to: string;
  label: string;
  icon: ComponentType<{ fontSize: string; "aria-hidden": boolean }>;
};

const lenker: Lenke[] = [
  { to: RouteConfig.INDEX, label: "Dashboard", icon: HouseIcon },
  { to: RouteConfig.MINE_SAKER, label: "Mine saker", icon: FolderIcon },
  { to: RouteConfig.FORDELING, label: "Fordeling", icon: TasklistIcon },
  {
    to: RouteConfig.REGISTRER_SAK,
    label: "Registrer sak",
    icon: PlusCircleIcon,
  },
  { to: RouteConfig.STATISTIKK, label: "Statistikk", icon: BarChartIcon },
];

function useErLitenSkjerm() {
  const [erLiten, setErLiten] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    setErLiten(mediaQuery.matches);

    function oppdater(e: MediaQueryListEvent) {
      setErLiten(e.matches);
    }
    mediaQuery.addEventListener("change", oppdater);
    return () => mediaQuery.removeEventListener("change", oppdater);
  }, []);

  return erLiten;
}

export function AppSidebar() {
  const { preferences, oppdaterPreference } = usePreferences();
  const erLitenSkjerm = useErLitenSkjerm();

  const erKollapset = erLitenSkjerm || preferences.sidebarKollapset;

  const toggleSidebar = () => {
    oppdaterPreference("sidebarKollapset", !preferences.sidebarKollapset);
  };

  return (
    <nav
      aria-label="Hovedmeny"
      className={`shrink-0 border-r border-ax-border-neutral-subtle bg-ax-bg-neutral-soft flex flex-col transition-[width] duration-200 ease-in-out ${
        erKollapset ? "w-16" : "w-56"
      }`}
    >
      <ul className="flex flex-col list-none m-0 p-0 pt-4 flex-1">
        {lenker.map(({ to, label, icon: Icon }) => {
          const lenkInnhold = (
            <NavLink
              to={to}
              end={to === RouteConfig.INDEX}
              className={({ isActive }) =>
                `flex items-center gap-3 py-3 text-base no-underline overflow-hidden transition-colors ${
                  erKollapset ? "justify-center px-0" : "px-6"
                } ${
                  isActive
                    ? "bg-ax-bg-accent-soft text-ax-text-accent font-semibold border-l-[3px] border-ax-border-accent"
                    : "text-ax-text-neutral hover:bg-ax-bg-neutral-moderate-hover border-l-[3px] border-transparent"
                }`
              }
            >
              <Icon fontSize="1.5rem" aria-hidden={true} />
              <span
                className={`whitespace-nowrap transition-opacity duration-200 ${
                  erKollapset ? "opacity-0" : "opacity-100"
                }`}
              >
                {label}
              </span>
            </NavLink>
          );

          return (
            <li key={to}>
              {erKollapset ? (
                <Tooltip content={label} placement="right">
                  {lenkInnhold}
                </Tooltip>
              ) : (
                lenkInnhold
              )}
            </li>
          );
        })}
      </ul>
      <div className="sticky bottom-0 p-2 flex justify-center bg-ax-bg-neutral-soft">
        <Tooltip content={erKollapset ? "Vis meny" : "Skjul meny"} placement="right">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-expanded={!erKollapset}
            aria-controls="sidebar-nav"
            className="flex items-center justify-center w-10 h-10 rounded-full border border-ax-border-neutral-subtle bg-ax-bg-neutral-soft text-ax-text-neutral hover:bg-ax-bg-neutral-moderate-hover transition-colors cursor-pointer"
          >
            {erKollapset ? (
              <ChevronRightIcon fontSize="1.5rem" title="Vis meny" />
            ) : (
              <ChevronLeftIcon fontSize="1.5rem" title="Skjul meny" />
            )}
          </button>
        </Tooltip>
      </div>
    </nav>
  );
}
