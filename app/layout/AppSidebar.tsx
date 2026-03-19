import {
  BarChartIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CogIcon,
  FolderIcon,
  HouseIcon,
  PlusCircleIcon,
  TasklistIcon,
} from "@navikt/aksel-icons";
import { Tooltip } from "@navikt/ds-react";
import { useState, type ComponentType } from "react";
import { NavLink } from "react-router";
import { usePreferences } from "~/preferanser/PreferencesContext";
import { RouteConfig } from "~/routeConfig";
import { InnstillingerModal } from "./InnstillingerModal";

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

export function AppSidebar() {
  const { preferences, oppdaterPreference } = usePreferences();
  const [erInnstillingerApne, setErInnstillingerApne] = useState(false);

  const erKollapset = preferences.sidebarKollapset;

  const toggleSidebar = () => {
    oppdaterPreference("sidebarKollapset", !preferences.sidebarKollapset);
  };

  return (
    <>
      <nav
        id="sidebar-nav"
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
                  `flex items-center py-3 text-base no-underline overflow-hidden transition-colors border-l-4 ${
                    isActive
                      ? "bg-ax-bg-accent-soft text-ax-text-accent font-semibold border-ax-border-accent"
                      : "text-ax-text-neutral hover:bg-ax-bg-neutral-moderate-hover border-transparent"
                  }`
                }
              >
                <span className="flex items-center justify-center w-[calc(4rem-4px)] shrink-0">
                  <Icon fontSize="1.5rem" aria-hidden={true} />
                </span>
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
                    <span>{lenkInnhold}</span>
                  </Tooltip>
                ) : (
                  lenkInnhold
                )}
              </li>
            );
          })}
        </ul>
        <div className="sticky bottom-0 p-2 flex flex-col justify-start gap-2 pl-[calc((4rem-2.5rem)/2)] bg-ax-bg-neutral-soft">
          <Tooltip content="Innstillinger" placement="right">
            <button
              type="button"
              aria-label="Innstillinger"
              onClick={() => setErInnstillingerApne(true)}
              className="flex items-center justify-center w-10 h-10 rounded-full border border-ax-border-neutral-subtle bg-ax-bg-neutral-soft text-ax-text-neutral hover:bg-ax-bg-neutral-moderate-hover transition-colors cursor-pointer"
            >
              <CogIcon fontSize="1.5rem" title="Innstillinger" />
            </button>
          </Tooltip>
          <Tooltip content={erKollapset ? "Vis meny" : "Skjul meny"} placement="right">
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={erKollapset ? "Vis meny" : "Skjul meny"}
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
      <InnstillingerModal
        erApen={erInnstillingerApne}
        onClose={() => setErInnstillingerApne(false)}
        preferences={preferences}
        onPreferenceChange={oppdaterPreference}
      />
    </>
  );
}
