import { useEffect, useRef } from "react";

type Rolle = { tittel: string; navn: string[] };
type Seksjon = { overskrift: string; roller?: Rolle[]; tekst?: string[] };

const SEKSJONER: Seksjon[] = [
  {
    overskrift: "Teamet",
    roller: [
      { tittel: "Produktleder", navn: ["Espen Einn"] },
      { tittel: "Prosessleder", navn: ["Hans Dragnes"] },
      { tittel: "Tech lead", navn: ["Snorri Hansson Engen"] },
      { tittel: "Frontendutvikler", navn: ["Kristofer Giltvedt Selbekk"] },
      {
        tittel: "Backendutviklere",
        navn: ["Alem Basic", "Hans Jacob Aslaksrud Melby", "Sturle Helland"],
      },
      { tittel: "Designere", navn: ["Nora Helgheim Holte", "Katinka Odner", "Julia Kuhley"] },
      { tittel: "Jurist", navn: ["Kari Steinseth"] },
    ],
  },
  {
    overskrift: "Utøvende produsenter",
    roller: [
      { tittel: "Direktør, Nav Kontroll", navn: ["Ole Johan Heir"] },
      { tittel: "Seksjonsleder, Kontroll og Internasjonalt", navn: ["Espen Nord Eidene"] },
      { tittel: "Produktlead, SKI", navn: ["Tor Halle"] },
      { tittel: "Head of Access", navn: ["Bjørn Holsen"] },
    ],
  },
  {
    overskrift: "Med støtte fra Nav Kontroll",
    tekst: [
      "Eystein Emberland",
      "Sidsel Torp",
      "Katrine Waaktaar-Slokvik",
      "Cathrine Ødegård Petersen",
    ],
  },
  {
    overskrift: "Medvirkende",
    tekst: [
      "Tusen takk til alle som har brukertestet, blitt intervjuet, vært med på workshops og alt annet som har gjort Watson bedre.",
    ],
  },
  {
    overskrift: "En spesiell takk til",
    tekst: [
      "Nav Kontroll",
      "Seksjon for Kontroll og Internasjonalt (SKI)",
      "Nav IT",
      "Innsiktsteamet",
      "Alle som har hjulpet oss med sikkerhet, personvern og gjennomføring av brukertester",
    ],
  },
  {
    overskrift: "Spesialeffekter",
    tekst: [
      "Anthropic, OpenAI og Google for gode AI-modeller",
      "Hans Kristian Flaatten og gjengen for utviklingen av nav-pilot",
    ],
  },
];

type EndCreditsProps = {
  onLukk: () => void;
};

/**
 * Easter egg: fullskjerms rulletekst over alle som har vært med på å lage
 * Watson. Lukkes med Escape, ved klikk, eller når teksten har rullet ferdig.
 * Med `prefers-reduced-motion` vises teksten statisk og kan scrolles manuelt.
 */
export function EndCredits({ onLukk }: EndCreditsProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // showModal() legger rulleteksten i top layer, flytter fokus inn i den og
  // gjør resten av siden inert. Fokus gis tilbake til forrige element ved lukking.
  useEffect(() => {
    const dialog = dialogRef.current;
    const forrigeFokus = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (forrigeFokus instanceof HTMLElement) forrigeFokus.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-label="Rulletekst"
      className="end-credits"
      onClick={onLukk}
      onCancel={(event) => {
        // Escape: la React-tilstanden styre lukkingen.
        event.preventDefault();
        onLukk();
      }}
    >
      <div className="end-credits-rull" onAnimationEnd={onLukk}>
        <h2 className="end-credits-tittel">Watson</h2>
        <p className="end-credits-undertittel">Laget av Team Holmes</p>
        {SEKSJONER.map((seksjon) => (
          <section key={seksjon.overskrift} className="end-credits-seksjon">
            <h3 className="end-credits-overskrift">{seksjon.overskrift}</h3>
            {seksjon.roller?.map((rolle) => (
              <div key={rolle.tittel} className="end-credits-rolle">
                <span className="end-credits-rolletittel">{rolle.tittel}</span>
                <span className="end-credits-navn">
                  {rolle.navn.map((navn) => (
                    <span key={navn}>{navn}</span>
                  ))}
                </span>
              </div>
            ))}
            {seksjon.tekst?.map((linje) => (
              <p key={linje} className="end-credits-tekst">
                {linje}
              </p>
            ))}
          </section>
        ))}
        <p className="end-credits-slutt">Slutt</p>
      </div>
      <button
        type="button"
        className="end-credits-lukk"
        onClick={(event) => {
          event.stopPropagation();
          onLukk();
        }}
      >
        Lukk (Esc)
      </button>
    </dialog>
  );
}
