/** Joins class names, skipping falsy ones: cx(styles.card, isOut && styles.dim). */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
