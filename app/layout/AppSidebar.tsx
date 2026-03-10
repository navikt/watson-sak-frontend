import { NavLink } from "react-router";
import { RouteConfig } from "~/routeConfig";

const lenker = [
  { to: RouteConfig.MINE_SAKER, label: "Mine saker" },
  { to: RouteConfig.FORDELING, label: "Fordeling" },
  { to: RouteConfig.REGISTRER_SAK, label: "Registrer sak" },
  { to: RouteConfig.STATISTIKK, label: "Statistikk" },
];

export function AppSidebar() {
  return (
    <nav aria-label="Hovedmeny" className="w-56 shrink-0 border-r border-border-subtle bg-surface-subtle">
      <ul className="flex flex-col list-none m-0 p-0 pt-4">
        {lenker.map(({ to, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `block px-6 py-3 text-sm no-underline transition-colors ${
                  isActive
                    ? "bg-surface-action-subtle text-text-action font-semibold border-l-[3px] border-border-action"
                    : "text-text-default hover:bg-surface-hover border-l-[3px] border-transparent"
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
