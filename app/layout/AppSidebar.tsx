import { NavLink } from "react-router";
import { RouteConfig } from "~/routeConfig";

const lenker = [
  { to: RouteConfig.INDEX, label: "Dashboard" },
  { to: RouteConfig.MINE_SAKER, label: "Mine saker" },
  { to: RouteConfig.FORDELING, label: "Fordeling" },
  { to: RouteConfig.REGISTRER_SAK, label: "Registrer sak" },
  { to: RouteConfig.STATISTIKK, label: "Statistikk" },
];

export function AppSidebar() {
  return (
    <nav
      aria-label="Hovedmeny"
      className="w-56 shrink-0 border-r border-ax-border-neutral-subtle bg-ax-bg-neutral-soft"
    >
      <ul className="flex flex-col list-none m-0 p-0 pt-4">
        {lenker.map(({ to, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === RouteConfig.INDEX}
              className={({ isActive }) =>
                `block px-6 py-3 text-base no-underline transition-colors ${
                  isActive
                    ? "bg-ax-bg-accent-soft text-ax-text-accent font-semibold border-l-[3px] border-ax-border-accent"
                    : "text-ax-text-neutral hover:bg-ax-bg-neutral-moderate-hover border-l-[3px] border-transparent"
                }`
              }
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
