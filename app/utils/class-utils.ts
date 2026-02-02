/**
 * Util for å kombinere klasser
 *
 * @param classes - Klasser som skal kombineres, evnt false eller undefined for å fjerne klassen
 * @returns Kombinerte klasser som en streng
 *
 * @example
 * ```tsx
 * cn(
 *   "foo",
 *   "bar",
 *   true && "baz",
 *   false && "boz"
 * ) // "foo bar baz"
 * ```
 */
export const cn = (...classes: (string | boolean | undefined)[]): string =>
  classes.filter(Boolean).join(" ");
