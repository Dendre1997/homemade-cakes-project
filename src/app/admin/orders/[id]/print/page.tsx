"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Order, Flavor, Diameter } from "@/types";
import { format } from "date-fns";
import LoadingSpinner from "@/components/ui/Spinner";
import AutoPrintTrigger from "@/components/admin/AutoPrintTrigger";

export default function OrderPrintPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [diameters, setDiameters] = useState<Diameter[]>([]);
  const [flavorMap, setFlavorMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  // --- Data Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [orderRes, flavorsRes, diametersRes] = await Promise.all([
          fetch(`/api/admin/orders/${id}`),
          fetch("/api/admin/flavors"),
          fetch("/api/admin/diameters"),
        ]);

        if (orderRes.ok) setOrder(await orderRes.json());
        if (flavorsRes.ok) {
          const flavorData = await flavorsRes.json();
          setFlavors(flavorData);
          const map: Record<string, string> = {};
          flavorData.forEach((f: Flavor) => (map[f._id] = f.name));
          setFlavorMap(map);
        }
        if (diametersRes.ok) setDiameters(await diametersRes.json());
      } catch (error) {
        console.error("Failed to load print data", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  if (isLoading) return <div className="flex justify-center p-12"><LoadingSpinner /></div>;
  if (!order) return <div className="p-12 text-center text-red-600 font-bold">Order Not Found</div>;

  // --- Helpers ---
  const getFlavorName = (id?: string) => (id ? flavorMap[id] || "Unknown" : "Unknown");
  const getDiameterName = (id?: string) => {
    const d = diameters.find((dia) => dia._id === id);
    return d ? d.name : id;
  };

  // --- Aggregated Totals (Mise-en-place) ---
  const prepTotals: Record<string, number> = {};

  order.items.forEach((item) => {
     // Combo Sets (Cakes + Items)
     if (item.selectedConfig?.cake) {
         // Bento Cake Flavor
         const cakeFlavorId = item.selectedConfig.cake.flavorId;
         if (cakeFlavorId) {
             const name = getFlavorName(cakeFlavorId) + " (Bento Cake)";
             prepTotals[name] = (prepTotals[name] || 0) + item.quantity;
         }
         // Treat Flavors
         item.selectedConfig.items?.forEach(subItem => {
             const name = getFlavorName(subItem.flavorId) + " (Treat)";
             prepTotals[name] = (prepTotals[name] || 0) + (subItem.count * item.quantity);
         });
     } 
     // Simple Sets (Just Items)
     else if (item.selectedConfig?.items?.length) {
         item.selectedConfig.items.forEach(subItem => {
             const name = getFlavorName(subItem.flavorId) + " (Set Item)";
             prepTotals[name] = (prepTotals[name] || 0) + (subItem.count * item.quantity);
         });
     }
     // Custom Orders
     else if (item.productType === 'custom') {
         const flavorName = item.customFlavor || item.flavor || "Custom Flavor";
         const sizeName = item.customSize || (item.diameterId ? getDiameterName(item.diameterId) : "Custom Size");
         const name = `CUSTOM - ${flavorName} [${sizeName}]`;
         prepTotals[name] = (prepTotals[name] || 0) + item.quantity;
     }
     // Standard Cakes
     else {
         const name = (item.flavor || "Standard") + (item.diameterId ? ` [${getDiameterName(item.diameterId)}]` : "");
         prepTotals[name] = (prepTotals[name] || 0) + item.quantity;
     }
  });

  const hasAllergy = order.customerInfo.notes || false;

  return (
    <div className="min-h-screen bg-white text-black p-0 print:p-0 font-sans max-w-[210mm] mx-auto">
      {/* Global Print Styles */}
      <style jsx global>{`
        @media print {
          @page { margin: 0; size: auto; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .item-block { break-inside: avoid; }
        }
      `}</style>

      {/* Auto Trigger */}
      <AutoPrintTrigger />
      
      {/* Allergy Alarm */}
      {order.customerInfo.notes && (
          <div className="bg-black text-white p-4 font-bold text-xl uppercase text-center border-b-4 border-white print:border-black">
              WARNING: {order.customerInfo.notes}
          </div>
      )}

      {/* Header */}
      <div className="p-6 border-b-4 border-black grid grid-cols-2 gap-6 items-start">
          <div className="flex flex-col gap-4">
              {/* Fulfillment Tag */}
              <div className={`
                  text-center text-3xl font-black uppercase py-2 px-4 border-4 border-black
                  ${order.deliveryInfo.method === 'delivery' ? 'bg-black text-white' : 'bg-white text-black'}
              `}>
                  [ {order.deliveryInfo.method} ]
              </div>
              
              {/* Payment Status */}
              <div className="text-xl font-bold uppercase">
                  {order.totalAmount > 0 ? "[ PAID ]" : <span className="border-2 border-black p-1 px-2">[ UNPAID - COLLECT CASH ]</span>}
              </div>
          </div>

          <div className="text-right flex flex-col justify-between h-full">
              <div className="text-5xl font-black tracking-tighter">
                  {order.deliveryInfo.deliveryDates?.[0]?.date 
                      ? format(new Date(order.deliveryInfo.deliveryDates[0].date), "MMM dd | h:mm a")
                      : "NO DATE"}
              </div>
              <div className="text-3xl font-bold text-gray-600">
                  #{order._id.toString().slice(-4)}
              </div>
          </div>
      </div>

      {/* The Prep Summary */}
      <div className="p-6 border-b-4 border-black bg-gray-100 print:bg-gray-100">
          <h2 className="text-xl font-black uppercase mb-3 border-b-2 border-black inline-block text-black">
              PREP LIST (MISE-EN-PLACE)
          </h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-lg font-bold">
              {Object.entries(prepTotals).map(([name, count]) => (
                  <div key={name} className="flex justify-between border-b border-gray-400 border-dashed pb-1">
                      <span>{name}</span>
                      <span className="text-2xl">{count}</span>
                  </div>
              ))}
          </div>
      </div>

      {/* The Item Blocks */}
      <div className="p-6 flex flex-col gap-6">
          {order.items.map((item, idx) => {
              const isCombo = item.selectedConfig && !!item.selectedConfig.cake;
              const isSet = item.selectedConfig && !item.selectedConfig.cake && (item.selectedConfig.items?.length || 0) > 0;
              const isCustom = item.productType === 'custom';
              const isStandard = !isCombo && !isSet && !isCustom;

              return (
                  <div key={idx} className="item-block border-4 border-black p-0 flex">
                      {/* Checkbox Strip */}
                      <div className="w-16 border-r-4 border-black flex items-center justify-center bg-gray-50">
                          <div className="w-8 h-8 border-4 border-black bg-white"></div>
                      </div>

                      {/* Content */}
                      <div className="flex-grow flex flex-col">
                          {/* Item Header */}
                          <div className="bg-black text-white p-2 flex justify-between items-center px-4">
                              <span className="font-bold text-xl uppercase">{item.name}</span>
                              <span className="font-mono text-xl">x{item.quantity}</span>
                          </div>

                          {/* Polymorphic Body */}
                          
                          {/* COMBO PACK */}
                          {isCombo && item.selectedConfig?.cake && (
                              <div className="flex flex-col">
                                  {/* Top: Bento */}
                                  <div className="p-4 border-b-4 border-black bg-gray-50">
                                      <div className="flex justify-between items-start mb-2">
                                          <span className="bg-black text-white px-2 py-1 text-sm font-bold uppercase">Bento Cake</span>
                                          <span className="font-bold text-lg">{getFlavorName(item.selectedConfig.cake.flavorId)}</span>
                                      </div>
                                      {/* Inscription Box */}
                                      <div className="border-4 border-black border-dashed p-3 mt-2 min-h-[60px] flex items-center justify-center bg-white">
                                          {item.selectedConfig.cake.inscription ? (
                                              <span className="font-serif italic text-2xl font-bold text-center">
                                                  &ldquo;{item.selectedConfig.cake.inscription}&rdquo;
                                              </span>
                                          ) : (
                                              <span className="text-gray-400 font-bold uppercase tracking-widest text-sm">(NO INSCRIPTION)</span>
                                          )}
                                      </div>
                                  </div>
                                  {/* Bottom: Treats */}
                                  <div className="p-4 bg-white">
                                      <span className="bg-black text-white px-2 py-1 text-sm font-bold uppercase mb-2 inline-block">Box Contents</span>
                                      <div className="grid grid-cols-2 gap-2 mt-2">
                                          {item.selectedConfig.items?.map((sub, i) => (
                                              <div key={i} className="flex items-center gap-2">
                                                  <span className="font-black text-xl">[{sub.count}]</span>
                                                  <span className="text-lg uppercase font-semibold text-black">{getFlavorName(sub.flavorId)}</span>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              </div>
                          )}

                          {/* SIMPLE SET */}
                          {isSet && (
                              <div className="p-4">
                                  <div className="grid grid-cols-2 gap-4">
                                      {item.selectedConfig?.items?.map((sub, i) => (
                                          <div key={i} className="flex items-center gap-2 border-b-2 border-gray-200 pb-1">
                                              <span className="font-black text-xl">[{sub.count}]</span>
                                              <span className="text-lg uppercase font-semibold text-black">{getFlavorName(sub.flavorId)}</span>
                                          </div>
                                      ))}
                                  </div>
                                  {item.inscription && (
                                     <div className="border-4 border-black border-dashed p-3 mt-4 min-h-[60px] flex items-center justify-center bg-white">
                                          <span className="font-serif italic text-2xl font-bold text-center">
                                              &ldquo;{item.inscription}&rdquo;
                                          </span>
                                     </div>
                                  )}
                              </div>
                          )}

                          {/* CUSTOM ORDER */}
                          {isCustom && (
                            <div className="p-4 flex flex-col gap-4">
                                {/* Specs Row */}
                                <div className="grid grid-cols-2 gap-4 border-b-2 border-dashed border-gray-300 pb-4">
                                    <div>
                                        <span className="block text-xs font-bold uppercase text-gray-500">Size / Config</span>
                                        <span className="text-xl font-bold uppercase">
                                            {item.customSize || (item.diameterId ? getDiameterName(item.diameterId) : "Custom Size")}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-xs font-bold uppercase text-gray-500">Flavor Profile</span>
                                        <span className="text-xl font-bold uppercase">
                                            {item.customFlavor || item.flavor || "Custom Flavor"}
                                        </span>
                                    </div>
                                </div>
                                
                                {/* Description / Inscription */}
                                <div className="border-4 border-black border-dashed p-4 bg-white min-h-[100px]">
                                    <span className="block text-xs font-bold uppercase text-gray-500 mb-1">Design / Inscription details</span>
                                    <div className="text-lg font-medium whitespace-pre-wrap leading-snug">
                                        {item.inscription || item.adminNotes || "No details provided."}
                                    </div>
                                </div>
                                
                                {item.adminNotes && item.adminNotes !== item.inscription && (
                                    <div className="bg-gray-100 p-2 border border-gray-300 text-sm">
                                        <span className="font-bold">INTERNAL NOTE:</span> {item.adminNotes}
                                    </div>
                                )}
                            </div>
                          )}

                          {/*  STANDARD CAKE */}
                          {isStandard && (
                              <div className="p-4 grid grid-cols-2 gap-6">
                                  <div className="flex flex-col justify-center">
                                      <div className="text-2xl font-bold uppercase mb-1">
                                          {item.diameterId ? getDiameterName(item.diameterId) : "Standard Size"}
                                      </div>
                                      <div className="text-xl text-gray-800">
                                          {item.flavor || "Standard Flavor"}
                                      </div>
                                  </div>
                                  <div className="border-4 border-black border-dashed p-3 min-h-[80px] flex items-center justify-center bg-white">
                                      {item.inscription ? (
                                          <span className="font-serif italic text-2xl font-bold text-center leading-tight">
                                              &ldquo;{item.inscription}&rdquo;
                                          </span>
                                      ) : (
                                          <span className="text-gray-400 font-bold uppercase tracking-widest text-sm">(NO INSCRIPTION)</span>
                                      )}
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              );
          })}
      </div>

      {/* Footer */}
      <div className="p-6 border-t-4 border-black mt-4 page-break-before-auto">
          <div className="grid grid-cols-2 gap-8">
              <div>
                  <h3 className="font-bold uppercase text-sm text-gray-500 mb-1">Customer</h3>
                  <div className="text-xl font-bold">{order.customerInfo.name}</div>
                  <div className="text-lg">{order.customerInfo.phone}</div>
              </div>
              {(order.deliveryInfo.method === 'delivery') && (
                  <div>
                      <h3 className="font-bold uppercase text-sm text-gray-500 mb-1">Delivery Address</h3>
                      <div className="text-lg font-bold leading-tight border-l-4 border-black pl-3">
                          {order.deliveryInfo.address || "No Address Provided"}
                      </div>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
}
