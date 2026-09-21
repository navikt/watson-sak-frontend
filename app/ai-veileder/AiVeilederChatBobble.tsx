import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { ChatIcon, XMarkIcon } from "@navikt/aksel-icons";
import { Alert, Button, Chat, Heading, Loader, Textarea, VStack } from "@navikt/ds-react";
import { RobotIcon } from "@navikt/aksel-icons";
import { FeatureFlagg } from "~/feature-toggling/featureflagg";
import { useEnkeltFeatureFlagg } from "~/feature-toggling/useFeatureFlagg";
import { RouteConfig } from "~/routeConfig";
import type { ChatSvar } from "./api.server";

/**
 * Flytende AI-veileder-chatboble, synlig nederst i høyre hjørne på alle sider
 * (i stil med en vanlig support-chat-widget) — ikke en egen side.
 *
 * Skjules helt bak feature-flagget `FeatureFlagg.AI_VEILEDER`. Boten har ingen
 * tilgang til kontrollsak-/persondata — kun en statisk kunnskapsbase om selve
 * grensesnittet (se watson-admin-api sin chatbot-modul).
 */

type Melding = {
  fra: "bruker" | "ai";
  tekst: string;
  escalateSuggested?: boolean;
};

type ChatFetcherData = { data: ChatSvar } | { feil: string };

export function AiVeilederChatBobble() {
  const erPåskrudd = useEnkeltFeatureFlagg(FeatureFlagg.AI_VEILEDER);
  const [erÅpen, setErÅpen] = useState(false);
  const [spørsmål, setSpørsmål] = useState("");
  const [meldinger, setMeldinger] = useState<Melding[]>([]);
  const fetcher = useFetcher<ChatFetcherData>();
  const forrigeState = useRef(fetcher.state);

  // Legg til AI-svaret i samtalen når fetcheren er ferdig med et vellykket/feilet kall.
  useEffect(() => {
    if (forrigeState.current !== "idle" && fetcher.state === "idle" && fetcher.data) {
      const respons = fetcher.data;
      if ("data" in respons) {
        const { reply, escalateSuggested } = respons.data;
        setMeldinger((forrige) => [...forrige, { fra: "ai", tekst: reply, escalateSuggested }]);
      } else {
        setMeldinger((forrige) => [...forrige, { fra: "ai", tekst: respons.feil }]);
      }
    }
    forrigeState.current = fetcher.state;
  }, [fetcher.state, fetcher.data]);

  if (!erPåskrudd) {
    return null;
  }

  const laster = fetcher.state !== "idle";

  const håndterSpørsmål = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (laster) return;
    const stiltSpørsmål = spørsmål;
    setMeldinger((forrige) => [
      ...forrige,
      { fra: "bruker", tekst: stiltSpørsmål || "(tomt spørsmål)" },
    ]);
    setSpørsmål("");
    fetcher.submit(
      { melding: stiltSpørsmål },
      { method: "POST", action: RouteConfig.API.AI_VEILEDER_MELDING },
    );
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {erÅpen && (
        <div
          data-testid="ai-veileder-bobble-panel"
          className="mb-3 w-[360px] max-w-[calc(100vw-3rem)] rounded-lg border border-ax-border-neutral-subtle bg-ax-bg-default shadow-lg flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-ax-border-neutral-subtle bg-ax-bg-neutral-soft">
            <Heading level="2" size="xsmall" className="flex items-center gap-2">
              <RobotIcon fontSize="1.25rem" aria-hidden={true} />
              AI-veileder
            </Heading>
            <Button
              variant="tertiary-neutral"
              size="small"
              icon={<XMarkIcon aria-hidden={true} />}
              onClick={() => setErÅpen(false)}
              aria-label="Lukk AI-veileder"
            />
          </div>

          <div className="flex-1 max-h-80 overflow-y-auto px-4 py-3">
            {meldinger.length === 0 ? (
              <p className="text-ax-text-subtle text-sm">
                Spør meg om hvordan du bruker Watson Sak — jeg kan ikke hjelpe med innholdet i
                konkrete saker.
              </p>
            ) : (
              <VStack gap="space-8" data-testid="ai-veileder-samtale">
                {meldinger.map((melding, index) =>
                  melding.fra === "bruker" ? (
                    <Chat key={index} position="right" size="small" name="Deg">
                      <Chat.Bubble>{melding.tekst}</Chat.Bubble>
                    </Chat>
                  ) : (
                    <VStack key={index} gap="space-4">
                      <Chat
                        position="left"
                        size="small"
                        name="AI-veileder"
                        avatar={<RobotIcon aria-hidden={true} />}
                      >
                        <Chat.Bubble data-testid="ai-veileder-svar">{melding.tekst}</Chat.Bubble>
                      </Chat>
                      {melding.escalateSuggested && (
                        <Alert variant="info" size="small" className="ml-10">
                          Usikker på svaret? Ta kontakt med en kollega eller support.
                        </Alert>
                      )}
                    </VStack>
                  ),
                )}
                {laster && (
                  <Chat
                    position="left"
                    size="small"
                    name="AI-veileder"
                    avatar={<RobotIcon aria-hidden={true} />}
                  >
                    <Chat.Bubble>
                      <Loader size="xsmall" title="Venter på svar …" />
                    </Chat.Bubble>
                  </Chat>
                )}
              </VStack>
            )}
          </div>

          <form
            onSubmit={håndterSpørsmål}
            className="flex items-end gap-2 px-4 py-3 border-t border-ax-border-neutral-subtle"
          >
            <Textarea
              label="Skriv en melding"
              hideLabel
              size="small"
              minRows={1}
              value={spørsmål}
              onChange={(event) => setSpørsmål(event.target.value)}
              className="flex-1"
              disabled={laster}
            />
            <Button type="submit" size="small" disabled={laster}>
              Send
            </Button>
          </form>
        </div>
      )}

      <Button
        variant="primary"
        size="medium"
        className="rounded-full! w-14! h-14! p-0! shadow-lg"
        onClick={() => setErÅpen((forrige) => !forrige)}
        aria-label={erÅpen ? "Lukk AI-veileder" : "Åpne AI-veileder"}
        aria-expanded={erÅpen}
        icon={
          erÅpen ? (
            <XMarkIcon fontSize="1.5rem" aria-hidden={true} />
          ) : (
            <ChatIcon fontSize="1.5rem" aria-hidden={true} />
          )
        }
      />
    </div>
  );
}
