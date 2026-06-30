/** Parser repeated URL-params til liste. */
export function parseMultiValueParam(params: URLSearchParams, key: string): string[] {
  return params.getAll(key).filter(Boolean);
}
