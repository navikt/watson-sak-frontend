/** Parser som håndterer både repeated params og komma-separerte verdier. */
export function parseMultiValueParam(params: URLSearchParams, key: string): string[] {
  return params
    .getAll(key)
    .flatMap((v) => v.split(","))
    .filter(Boolean);
}
