import { FileUpload, VStack } from "@navikt/ds-react";

type Props = {
  filer: File[];
  setFiler: (updater: (existing: File[]) => File[]) => void;
};

export function Saksvedlegg({ filer, setFiler }: Props) {
  return (
    <VStack gap="space-12" className="max-w-2xl">
      <FileUpload.Dropzone
        label="Last opp dokumenter (valgfritt)"
        description="Legg ved filer som dokumenterer saken. Maks 50 MB per fil."
        accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx"
        onSelect={(_, partitioned) =>
          setFiler((eksisterende) => [...eksisterende, ...partitioned.accepted])
        }
      />
      {filer.length > 0 && (
        <VStack gap="space-4" as="ul" aria-label="Opplastede filer">
          {filer.map((fil, indeks) => (
            <FileUpload.Item
              key={`${fil.name}-${indeks}`}
              as="li"
              file={fil}
              button={{
                action: "delete",
                onClick: () =>
                  setFiler((eksisterende) => eksisterende.filter((_, i) => i !== indeks)),
              }}
            />
          ))}
        </VStack>
      )}
    </VStack>
  );
}
