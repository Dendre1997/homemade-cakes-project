"use client";

import dynamic from "next/dynamic";
import LoadingSpinner from "@/components/ui/Spinner";
import { CustomOrder, IShape } from "@/types";

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
  shapes?: IShape[];
}

/** Entry client for custom order detail (includes QuickMessageCard in sidebar via CustomOrderDetail). */
export default function CustomOrderDetailClient({ initialOrder, shapes = [] }: Props) {
  return <CustomOrderDetail initialOrder={initialOrder} shapes={shapes} />;
}
