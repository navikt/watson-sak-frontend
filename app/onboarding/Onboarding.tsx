import { XMarkIcon } from "@navikt/aksel-icons";
import { Button, BodyLong, Heading, HStack, VStack } from "@navikt/ds-react";
import { flushSync } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { sporHendelse } from "~/analytics/analytics";
import { useEnkeltFeatureFlagg } from "~/feature-toggling/useFeatureFlagg";
import { FeatureFlagg } from "~/feature-toggling/featureflagg";
import { usePreferences } from "~/preferanser/PreferencesContext";
import { IDÉPORTAL_URL, ONBOARDING_STEG, type OnboardingSteg } from "./steg";

type SpotlightRect = { top: number; left: number; width: number; height: number };

function hentRect(steg: OnboardingSteg): SpotlightRect | null {
  if (!steg.mål) return null;
  const mål = document.querySelector(steg.mål);
  if (!(mål instanceof HTMLElement)) return null;
  const rect = mål.getBoundingClientRect();
  return {
    top: rect.top - 8,
    left: rect.left - 8,
    width: rect.width + 16,
    height: rect.height + 16,
  };
}

export function Onboarding() {
  const erPåskrudd = useEnkeltFeatureFlagg(FeatureFlagg.ONBOARDING);
  const { preferences, oppdaterPreference } = usePreferences();
  const erAktiv = erPåskrudd && !preferences.onboardingFullført;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const overskriftRef = useRef<HTMLHeadingElement>(null);
  const startetRef = useRef(false);
  const sistSporteStegRef = useRef<string | null>(null);
  const avslutterRef = useRef(false);
  const [steg, setSteg] = useState<OnboardingSteg[]>([]);
  const [stegnummer, setStegnummer] = useState(0);
  const [klar, setKlar] = useState(false);
  const [avslutter, setAvslutter] = useState(false);
  // Steget som kom inn via view transition skal ikke spille sin egen inn-animasjon i tillegg.
  const [stilleStegId, setStilleStegId] = useState<string | null>(null);
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const [kortplassering, setKortplassering] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!erAktiv || startetRef.current) return;
    const tilgjengeligeSteg = ONBOARDING_STEG.filter(
      (element) => !element.mål || hentRect(element),
    );
    if (tilgjengeligeSteg.length === 0) return;
    startetRef.current = true;
    setSteg(tilgjengeligeSteg);
    sporHendelse("onboarding startet", { antallSteg: tilgjengeligeSteg.length });
    setKlar(true);
  }, [erAktiv]);

  useEffect(() => {
    if (!klar) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [klar]);

  const aktivtSteg = steg[stegnummer];

  useEffect(() => {
    if (stilleStegId && aktivtSteg?.id !== stilleStegId) setStilleStegId(null);
  }, [aktivtSteg, stilleStegId]);

  const oppdaterSpotlight = useCallback(() => {
    if (!aktivtSteg?.mål) {
      setRect(null);
      setKortplassering({});
      return;
    }
    const målRect = hentRect(aktivtSteg);
    if (!målRect) {
      setRect(null);
      setKortplassering({});
      return;
    }
    setRect(målRect);
    const bredde = Math.min(560, window.innerWidth - 32);
    const høyde = Math.min(480, window.innerHeight - 32);
    const erIToppen = målRect.top + målRect.height < 120 && målRect.width < window.innerWidth / 2;
    if (erIToppen) {
      // Mål i headeren (søk, varsler): plasser kortet under, sentrert på målet.
      const left = Math.max(
        16,
        Math.min(målRect.left + målRect.width / 2 - bredde / 2, window.innerWidth - bredde - 16),
      );
      setKortplassering({ top: målRect.top + målRect.height + 24, left, width: bredde });
      return;
    }
    const left = Math.max(
      16,
      Math.min(målRect.left + målRect.width + 24, window.innerWidth - bredde - 16),
    );
    const top = Math.max(
      16,
      Math.min(målRect.top + målRect.height / 2 - høyde / 2, window.innerHeight - høyde - 16),
    );
    setKortplassering({ top, left, width: bredde });
  }, [aktivtSteg]);

  useEffect(() => {
    if (!klar || !aktivtSteg) return;
    oppdaterSpotlight();
    if (sistSporteStegRef.current !== aktivtSteg.id) {
      sistSporteStegRef.current = aktivtSteg.id;
      sporHendelse("onboarding steg vist", { steg: aktivtSteg.id, stegnummer: stegnummer + 1 });
    }
    overskriftRef.current?.focus();
    window.addEventListener("resize", oppdaterSpotlight);
    window.addEventListener("scroll", oppdaterSpotlight, true);
    return () => {
      window.removeEventListener("resize", oppdaterSpotlight);
      window.removeEventListener("scroll", oppdaterSpotlight, true);
    };
  }, [aktivtSteg, klar, oppdaterSpotlight, stegnummer]);

  // Kalles når dialogen er ferdig lukket. Nullstiller all tilstand, slik at
  // «Vis introduksjonen på nytt» kan starte en ny runde i samme mount.
  const nullstill = () => {
    startetRef.current = false;
    avslutterRef.current = false;
    sistSporteStegRef.current = null;
    setKlar(false);
    setAvslutter(false);
    setStegnummer(0);
    setSteg([]);
    setRect(null);
    setStilleStegId(null);
  };

  const avsluttOnboarding = async (fullført: boolean) => {
    if (!aktivtSteg || avslutterRef.current) return;
    avslutterRef.current = true;
    if (fullført) {
      sporHendelse("onboarding fullført");
    } else {
      sporHendelse("onboarding hoppet over", {
        steg: aktivtSteg.id,
        stegnummer: stegnummer + 1,
      });
    }
    await oppdaterPreference("onboardingFullført", true);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nullstill();
    } else {
      setAvslutter(true);
    }
  };

  useEffect(() => {
    if (!klar) return;
    const naviger = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // Eksplisitt i tillegg til dialogens cancel-event, som Chrome kan undertrykke.
        event.preventDefault();
        void avsluttOnboarding(false);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        if (stegnummer < steg.length - 1) setStegnummer((nå) => nå + 1);
        else void avsluttOnboarding(true);
      } else if (event.key === "ArrowLeft" && stegnummer > 0) {
        event.preventDefault();
        setStegnummer((nå) => nå - 1);
      }
    };
    window.addEventListener("keydown", naviger);
    return () => window.removeEventListener("keydown", naviger);
  }, [klar, steg.length, stegnummer]);

  // Hero-bakgrunnen rendres allerede på serveren, så appen ikke glimter forbi
  // før dialogen åpnes på klienten. Dialogen legger seg over i top layer.
  const forhåndsdekke =
    erAktiv && (!klar || aktivtSteg?.id === "velkomst") ? (
      <div aria-hidden="true" className="onboarding-hero onboarding-forhåndsdekke" />
    ) : null;

  if (!klar || !aktivtSteg) return forhåndsdekke;

  const erSisteSteg = stegnummer === steg.length - 1;
  const erHero = aktivtSteg.id === "velkomst";

  function startOmvisning() {
    const redusertBevegelse = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (redusertBevegelse || typeof document.startViewTransition !== "function") {
      setStegnummer(1);
      return;
    }
    // Klassen avgrenser view transition-stilene til denne overgangen.
    const rot = document.documentElement;
    rot.classList.add("onboarding-vt");
    const overgang = document.startViewTransition(() => {
      flushSync(() => {
        setStilleStegId(steg[1]?.id ?? null);
        setStegnummer(1);
      });
    });
    void overgang.finished.finally(() => rot.classList.remove("onboarding-vt"));
  }

  const heroInnhold = (
    <div className="onboarding-hero-innhold">
      <p className="onboarding-hero-overlinje">Nav&nbsp;kontroll</p>
      <h1
        ref={overskriftRef}
        id="onboarding-tittel"
        className="onboarding-hero-tittel"
        tabIndex={-1}
      >
        {steg[0]?.tittel}
      </h1>
      <p className="onboarding-hero-tekst">{steg[0]?.tekst}</p>
      <HStack className="onboarding-hero-handling" gap="space-12" justify="center">
        <Button size="medium" variant="primary" onClick={startOmvisning}>
          Vis meg rundt
        </Button>
        <Button
          size="medium"
          variant="secondary-neutral"
          onClick={() => void avsluttOnboarding(false)}
        >
          Hopp over
        </Button>
      </HStack>
    </div>
  );

  if (erHero) {
    return (
      <>
        {forhåndsdekke}
        <dialog
          ref={dialogRef}
          aria-labelledby="onboarding-tittel"
          className={`onboarding-dialog${avslutter ? " onboarding-dialog-ut" : " onboarding-dialog-hero"}`}
          onCancel={(event) => {
            event.preventDefault();
            void avsluttOnboarding(false);
          }}
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget && avslutter) nullstill();
          }}
        >
          <div className="onboarding-hero">{heroInnhold}</div>
        </dialog>
      </>
    );
  }

  return (
    <>
      {forhåndsdekke}
      <dialog
        ref={dialogRef}
        aria-labelledby="onboarding-tittel"
        className={`onboarding-dialog${avslutter ? " onboarding-dialog-ut" : ""}`}
        onCancel={(event) => {
          event.preventDefault();
          void avsluttOnboarding(false);
        }}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget && avslutter) nullstill();
        }}
      >
        <div className="onboarding-scene">
          {rect ? (
            <div
              aria-hidden="true"
              className="onboarding-spotlight"
              style={{
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
              }}
            />
          ) : (
            <div aria-hidden="true" className="onboarding-slør" />
          )}
          <Button
            className="onboarding-hopp-over"
            variant="secondary-neutral"
            icon={<XMarkIcon aria-hidden />}
            iconPosition="right"
            onClick={() => void avsluttOnboarding(false)}
          >
            Hopp over
          </Button>
          <section
            className={`onboarding-kort${rect ? " onboarding-kort-spotlight" : " onboarding-kort-sentrert"}`}
            style={rect ? kortplassering : undefined}
          >
            <VStack gap="space-24">
              <div
                key={aktivtSteg.id}
                className={`onboarding-kortinnhold${aktivtSteg.id === stilleStegId ? " onboarding-kortinnhold-stille" : ""}`}
              >
                <VStack gap="space-16">
                  <Heading
                    ref={overskriftRef}
                    id="onboarding-tittel"
                    aria-live="polite"
                    level="1"
                    size="xlarge"
                    tabIndex={-1}
                  >
                    {aktivtSteg.tittel}
                  </Heading>
                  <BodyLong size="large">{aktivtSteg.tekst}</BodyLong>
                  {aktivtSteg.id === "lykke-til" && (
                    <a
                      className="onboarding-idéportal"
                      href={IDÉPORTAL_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => sporHendelse("onboarding idéportal klikket")}
                    >
                      Gå til Idéportalen
                    </a>
                  )}
                </VStack>
              </div>
              <VStack gap="space-12">
                <HStack className="onboarding-fremdrift" gap="space-8" align="center">
                  <div aria-hidden="true" className="onboarding-prikker">
                    {steg.map((element, index) => (
                      <span
                        key={element.id}
                        className={
                          index === stegnummer ? "onboarding-prikk aktiv" : "onboarding-prikk"
                        }
                      />
                    ))}
                  </div>
                  <span aria-live="polite">
                    Steg {stegnummer + 1} av {steg.length}
                  </span>
                </HStack>
                <HStack className="onboarding-kontroller" gap="space-8" align="center">
                  {stegnummer > 0 && (
                    <Button variant="tertiary" onClick={() => setStegnummer((nå) => nå - 1)}>
                      Tilbake
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    onClick={() => {
                      if (erSisteSteg) void avsluttOnboarding(true);
                      else setStegnummer((nå) => nå + 1);
                    }}
                  >
                    {erSisteSteg ? "Kom i gang" : "Neste"}
                  </Button>
                </HStack>
              </VStack>
            </VStack>
          </section>
        </div>
      </dialog>
    </>
  );
}
