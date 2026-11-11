import { BoxIcon as BoxIconSix } from "@/components/icons/quantityIcons/BoxIconSix";
import { BoxIconTwelve } from "@/components/icons/quantityIcons/BoxIconTwelve";
import { BoxIconTwentyFour } from "@/components/icons/quantityIcons/BoxIconTwentyFour";

/** Built-in box icon for a set without an uploaded icon, chosen by piece count. */
export function SetBoxIcon({
  pieceCount,
  className,
}: {
  pieceCount: number;
  className?: string;
}) {
  if (pieceCount <= 6) return <BoxIconSix className={className} />;
  if (pieceCount <= 12) return <BoxIconTwelve className={className} />;
  return <BoxIconTwentyFour className={className} />;
}
