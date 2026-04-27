// Visuell trakt-komponent som viser saker per behandlingssteg.
// Label vises til venstre utenfor den blå boksen.
// Boksene snevres inn symmetrisk og er midtstilt i bar-området.

type TraktSteg = {
  label: string;
  antall: number;
};

interface Props {
  steg: TraktSteg[];
}

export function Trakt({ steg }: Props) {
  const maks = steg[0]?.antall ?? 1;

  return (
    <div
      role="img"
      aria-label={`Trakt over saker per steg: ${steg.map((s) => `${s.label} ${s.antall}`).join(", ")}`}
      className="space-y-1"
    >
      {steg.map((s) => {
        const prosentBredde = (s.antall / maks) * 100;
        const sideMargin = (100 - prosentBredde) / 2;

        return (
          <div key={s.label} className="flex items-center gap-3">
            <span className="w-32 shrink-0 text-right text-sm font-medium text-ax-text-neutral">
              {s.label}
            </span>
            <div className="flex flex-1">
              <div
                style={{
                  width: `${prosentBredde}%`,
                  marginLeft: `${sideMargin}%`,
                }}
                className="flex min-h-10 items-center justify-center rounded-md bg-ax-bg-accent-moderate px-3 py-2"
              >
                <span className="text-sm font-bold text-ax-text-accent">{s.antall}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
