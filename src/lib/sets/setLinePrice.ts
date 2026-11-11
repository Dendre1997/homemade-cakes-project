/**
 * The single price rule for one unit of a set product line (simple set or combo),
 * priced from the boxes embedded on the product.
 *
 * Each caller must keep its own box matching, missing-box fallback, and rounding:
 * cart lines, open carts, and stored orders already depend on those exact numbers.
 */

export interface SetPriceBox {
  _id?: unknown;
  label?: unknown;
  price?: unknown;
}

export interface SetPriceProduct {
  structureBasePrice?: unknown;
  availableQuantityConfigs?: SetPriceBox[];
  comboConfig?: { hasCake?: boolean } | null;
}

/**
 * - `label`: box whose label equals the identifier; an empty identifier matches nothing.
 * - `labelThenId`: label first, then the box `_id` (legacy cart lines).
 * - `idOrLabel`: the box `_id` when it has one, else its label (product page selection).
 */
export type SetBoxMatch = "label" | "labelThenId" | "idOrLabel";

/**
 * What happens when no box matches:
 * - `defaultBoxElseBase`: price the first box, or the product base price when the first box is free.
 * - `basePrice`: the whole set portion is the product base price, without the combo formula.
 * - `defaultBox`: price the first box.
 * - `zeroBox`: price the box at 0.
 * - `none`: no price; the caller decides.
 */
export type MissingSetBox =
  | "defaultBoxElseBase"
  | "basePrice"
  | "defaultBox"
  | "zeroBox"
  | "none";

/**
 * `cents` (server) rounds every input to 2 decimals, turns NaN into 0, and skips a
 * non-positive cake flavor price; `none` (client) only turns falsy amounts into 0.
 */
export type SetPriceRounding = "cents" | "none";

export interface SetLinePriceOptions {
  match: SetBoxMatch;
  missingBox: MissingSetBox;
  rounding: SetPriceRounding;
  /** Added for every set line. */
  inscriptionPrice?: number;
  /** Added for combos only; leave undefined when no cake flavor was found. */
  cakeFlavorPrice?: number;
}

export interface SetLinePriceResult {
  /** Unit price of the set portion, before addons. */
  price: number;
  box: SetPriceBox | undefined;
}

function toAmount(value: unknown, rounding: SetPriceRounding): number {
  if (rounding === "cents") {
    const num = Number(value);
    return isNaN(num) ? 0 : Number(num.toFixed(2));
  }
  return (value as number) || 0;
}

function findSetBox(
  boxes: SetPriceBox[] | undefined,
  identifier: unknown,
  match: SetBoxMatch
): SetPriceBox | undefined {
  if (!boxes) return undefined;
  const wanted = identifier == null ? undefined : String(identifier);

  if (match === "idOrLabel") {
    return boxes.find((box) => (box._id || box.label) === identifier);
  }
  if (match === "label" && !identifier) return undefined;

  const byLabel = boxes.find(
    (box) => !!box.label && String(box.label) === wanted
  );
  if (byLabel || match === "label") return byLabel;

  return boxes.find((box) => !!box._id && String(box._id) === wanted);
}

export function setLinePrice(
  product: SetPriceProduct,
  boxIdentifier: unknown,
  options: SetLinePriceOptions & { missingBox: Exclude<MissingSetBox, "none"> }
): SetLinePriceResult;
export function setLinePrice(
  product: SetPriceProduct,
  boxIdentifier: unknown,
  options: SetLinePriceOptions
): SetLinePriceResult | null;
export function setLinePrice(
  product: SetPriceProduct,
  boxIdentifier: unknown,
  options: SetLinePriceOptions
): SetLinePriceResult | null {
  const { rounding } = options;
  const boxes = product.availableQuantityConfigs;
  const base = toAmount(product.structureBasePrice, rounding);
  const defaultBox = toAmount(boxes?.[0]?.price, rounding);
  const isCombo = !!product.comboConfig?.hasCake;

  const box = findSetBox(boxes, boxIdentifier, options.match);

  let price: number;
  if (!box && options.missingBox === "none") return null;

  if (!box && options.missingBox === "basePrice") {
    price = base;
  } else {
    let boxPrice: number;
    if (box) boxPrice = toAmount(box.price, rounding);
    else if (options.missingBox === "defaultBoxElseBase")
      boxPrice = defaultBox > 0 ? defaultBox : base;
    else if (options.missingBox === "defaultBox") boxPrice = defaultBox;
    else boxPrice = 0;

    price = isCombo ? base - defaultBox + boxPrice : boxPrice;
  }

  if (options.inscriptionPrice) price += options.inscriptionPrice;
  if (isCombo && options.cakeFlavorPrice !== undefined) {
    if (rounding === "none") {
      price += options.cakeFlavorPrice;
    } else {
      const flavorPrice = toAmount(options.cakeFlavorPrice, rounding);
      if (flavorPrice > 0) price += flavorPrice;
    }
  }

  return { price, box };
}
