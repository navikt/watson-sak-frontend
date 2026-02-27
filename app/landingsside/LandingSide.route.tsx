import { Page } from "@navikt/ds-react";
import { PageBlock } from "@navikt/ds-react/Page";

export default function LandingSide() {
  return (
    <Page>
      <title>Watson Sak</title>
      <PageBlock
        width="text"
        gutters
        className="flex min-h-[50vh] items-center justify-center"
      >
        <p className="text-gray-500">Her er det ingenting enda…</p>
      </PageBlock>
    </Page>
  );
}
