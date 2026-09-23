import { useLoaderData } from "react-router";
import { MiljøtilpassetTittel } from "~/layout/MiljøtilpassetTittel";
import { MigreringInnhold } from "./MigreringInnhold";
import { loader } from "./MigreringSide.server";

export { loader };
export const handle = { bredPageBlock: true };

export default function MigreringSide() {
  const lister = useLoaderData<typeof loader>();

  return (
    <>
      <MiljøtilpassetTittel>Migrering – Watson Sak</MiljøtilpassetTittel>
      <MigreringInnhold lister={lister} />
    </>
  );
}
