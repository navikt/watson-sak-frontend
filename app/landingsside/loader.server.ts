import { beregnAntallPerStatus, beregnBehandlingstid } from "~/statistikk/beregninger";
import { mockAvslutningsdatoer, mockStatistikkSaker } from "~/statistikk/mock-data.server";
import { mockMineSaker } from "~/mine-saker/mock-data.server";
import { sorterSakerEtterDato } from "~/saker/utils";

export function loader() {
  const alleSaker = mockStatistikkSaker;
  const antallPerStatus = beregnAntallPerStatus(alleSaker);
  const behandlingstid = beregnBehandlingstid(alleSaker, mockAvslutningsdatoer);

  const mineSaker = sorterSakerEtterDato(mockMineSaker, "nyest").slice(0, 5);

  const prioriterteSaker = sorterSakerEtterDato(
    alleSaker.filter((s) => s.status === "tips mottatt"),
    "eldst",
  );

  return {
    nøkkeltall: {
      totalt: alleSaker.length,
      tipsMottatt: antallPerStatus["tips mottatt"],
      underUtredning: antallPerStatus["under utredning"],
      avsluttet: antallPerStatus.avsluttet,
    },
    mineSaker,
    prioriterteSaker,
    behandlingstid,
    antallPerStatus,
  };
}
