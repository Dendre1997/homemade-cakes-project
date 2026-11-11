/**
 * Display text for a line that chose a catalog set.
 * A line without a set id or set name is legacy: callers keep the text they show today.
 */
export function catalogSetLabel(
  config:
    | {
        setId?: string;
        setName?: string;
        pieceCount?: number;
        quantityConfigId?: string;
      }
    | null
    | undefined
): string | undefined {
  if (!config?.setId && !config?.setName) return undefined;
  const name = config.setName || config.quantityConfigId;
  if (!name) return undefined;
  return config.pieceCount ? `${name} · ${config.pieceCount} pieces` : name;
}
