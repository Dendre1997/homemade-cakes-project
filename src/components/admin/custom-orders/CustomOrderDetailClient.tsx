"use client";

import dynamic from "next/dynamic";
import LoadingSpinner from "@/components/ui/Spinner";
import { CustomOrder } from "@/types";

const CustomOrderDetail = dynamic(
  () => import("@/components/admin/custom-orders/CustomOrderDetail"),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    ),
  }
);

interface Props {
  initialOrder: CustomOrder;
}

/** Entry client for custom order detail (includes QuickMessageCard in sidebar via CustomOrderDetail). */
export default function CustomOrderDetailClient({ initialOrder }: Props) {
  return <CustomOrderDetail initialOrder={initialOrder} />;
}
