"use client";

import { useEffect, useState } from "react";
import { CustomOrder } from "@/types";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/Spinner";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { Alert } from "@/components/ui/Alert";
import { CalendarClock, MapPin, Truck, Phone, Mail, Instagram, ExternalLink, Calendar, PlusCircle, Facebook } from "lucide-react";
import { format } from "date-fns";
import Image from "next/image";

function StatefulCollapsible({ title, children }: { title: string, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <CollapsibleSection title={title} isOpen={isOpen} onToggle={() => setIsOpen(!isOpen)}>
      {children}
    </CollapsibleSection>
  );
}

export default function ClientRequestsTab({ userId }: { userId: string }) {
  const [requests, setRequests] = useState<CustomOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await fetch(`/api/custom-orders?userId=${userId}`);
        if (!res.ok) throw new Error("Failed to fetch requests");
        const data = await res.json();
        setRequests(data);
      } catch (err) {
        console.error(err);
        setError("Could not load custom requests.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchRequests();
  }, [userId]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">{error}</div>;
  }

  const pendingRequests = requests.filter(r => r.status !== "converted" && r.status !== "rejected");
  const rejectedRequests = requests.filter(r => r.status === "rejected");
  const convertedRequests = requests.filter(r => r.status === "converted");

  return (
    <div className="space-y-6">
      {pendingRequests.length === 0 && convertedRequests.length === 0 && rejectedRequests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
          <p className="text-lg text-gray-500 mb-4">You have no custom order requests.</p>
          <Link href="/custom-order">
            <Button>Create a Custom Request</Button>
          </Link>
        </div>
      ) : (
        <>
          {pendingRequests.map(req => {
            const isDelivery = req.deliveryMethod === 'delivery';
            const displayDate = req.date ? new Date(req.date) : null;
            
            return (
              <Card key={req._id} className="overflow-hidden shadow-sm border border-gray-200">
                <CardHeader className="bg-subtleBackground/50 pb-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="font-heading text-lg font-bold text-primary">
                        Custom {req.category} Request
                      </h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        ID: {req._id.toString().slice(-6).toUpperCase()} • Submitted {format(new Date(req.createdAt || req.date), "PPP")}
                      </p>
                    </div>
                    <Badge 
                      variant={req.status === 'rejected' ? 'destructive' : 'default'} 
                      className={req.status !== 'rejected' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : ''}
                    >
                      {req.status === 'pending_review' ? 'Pending Review' : req.status}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-6 space-y-6">
                   {/* Logistics row */}
                   <div className="flex flex-wrap items-center gap-4 text-primary text-sm font-medium bg-subtleBackground/30 p-3 rounded-lg border border-primary/10">
                     {displayDate && (
                        <div className="flex items-center gap-1.5">
                           <CalendarClock className="w-4 h-4 text-accent" />
                           {format(displayDate, "MMM do, yyyy")}
                        </div>
                     )}
                     {req.timeSlot && (
                        <div className="flex items-center gap-1.5">
                           <span className="text-muted-foreground">|</span>
                           {req.timeSlot}
                        </div>
                     )}
                     <div className="flex items-center gap-1.5 sm:ml-auto">
                        {isDelivery ? <Truck className="w-4 h-4 text-accent" /> : <MapPin className="w-4 h-4 text-accent" />}
                        <span className="capitalize">{req.deliveryMethod || "pickup"}</span>
                     </div>
                   </div>

                   {/* Product Spec */}
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="space-y-1 text-sm">
                       <p className="text-muted-foreground uppercase tracking-wider text-xs font-semibold">Size & Flavor</p>
                       <p className="text-primary font-medium">{req.details?.size || "Standard Size"}</p>
                       {req.details?.flavor && <p className="text-primary text-muted-foreground">{req.details.flavor}</p>}
                     </div>
                     {(req.details?.flavorNote || req.details?.textOnCake) && (
                       <div className="space-y-2 text-sm">
                         <p className="text-muted-foreground uppercase tracking-wider text-xs font-semibold">Customizations</p>
                         {req.details.flavorNote && (
                           <p className="text-primary"><span className="text-muted-foreground mr-1">Note:</span>{req.details.flavorNote}</p>
                         )}
                         {req.details.textOnCake && (
                           <p className="text-primary"><span className="text-muted-foreground mr-1">Text:</span>"{req.details.textOnCake}"</p>
                         )}
                       </div>
                     )}
                   </div>

                   {req.details?.designNotes && (
                     <StatefulCollapsible title="Design Notes">
                       <p className="text-sm text-primary p-3 bg-white border border-gray-100 rounded-md whitespace-pre-wrap leading-relaxed mt-2">
                         {req.details.designNotes}
                       </p>
                     </StatefulCollapsible>
                   )}

                   {req.addons && req.addons.length > 0 && (
                     <div>
                       <p className="text-muted-foreground uppercase tracking-wider text-xs font-semibold mb-2">Requested Add-ons</p>
                       <div className="flex flex-wrap gap-2">
                         {req.addons.map((a: any, i: number) => (
                           <span key={i} className="px-3 py-1 bg-subtleBackground/50 text-primary text-xs font-medium rounded-full border border-primary/10">
                             {a.name} {a.variantName && `(${a.variantName})`}
                           </span>
                         ))}
                       </div>
                     </div>
                   )}

                   {req.allergies && req.allergies !== "No" && (
                     <Alert type="warning" title="Allergies Noted">
                       {req.allergies}
                     </Alert>
                   )}

                   {req.referenceImages && req.referenceImages.length > 0 && (
                     <div>
                       <p className="text-muted-foreground uppercase tracking-wider text-xs font-semibold mb-3">Reference Images</p>
                       <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar snap-x snap-mandatory">
                         {req.referenceImages.map((url, idx) => (
                           <div
                             key={idx}
                             className="relative w-48 h-48 shrink-0 snap-center rounded-xl overflow-hidden border border-border shadow-sm"
                           >
                             <Image
                               src={url}
                               alt={`Reference image ${idx + 1}`}
                               fill
                               className="object-cover"
                             />
                           </div>
                         ))}
                       </div>
                     </div>
                   )}

                   {req.contact && (
                     <StatefulCollapsible title="Submitted Contact Info">
                       <div className="bg-gray-50 p-4 rounded-md border border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mt-2">
                         <div className="flex items-center gap-2 text-primary col-span-1 sm:col-span-2">
                           <Mail className="w-4 h-4 text-muted-foreground" />
                           <span className="font-medium">{req.contact.name}</span>
                           <span className="text-muted-foreground">({req.contact.email})</span>
                         </div>
                         {req.contact.phone && (
                           <div className="flex items-center gap-2 text-primary">
                             <Phone className="w-4 h-4 text-muted-foreground" />
                             {req.contact.phone}
                           </div>
                         )}
                         {req.contact.socialNickname && (
                           <div className="flex items-center gap-2 text-primary">
                             {req.contact.socialPlatform === 'facebook' ? (
                               <Facebook className="w-4 h-4 text-muted-foreground" />
                             ) : (
                               <Instagram className="w-4 h-4 text-muted-foreground" />
                             )}
                             @{req.contact.socialNickname}
                           </div>
                         )}
                       </div>
                     </StatefulCollapsible>
                   )}
                </CardContent>
                
                <CardFooter className="bg-subtleBackground/30 border-t p-4 flex justify-between items-center">
                  <span className="text-sm font-semibold text-muted-foreground">
                    {req.approximatePrice ? `Estimated: ~$${req.approximatePrice.toFixed(2)}` : "Price pending review"}
                  </span>
                  <Link href={`/custom-order?category=${req.category}`}>
                     <Button variant="outline" size="sm" className="flex items-center gap-1">
                       <PlusCircle className="w-4 h-4" />
                       <span className="hidden sm:inline">Submit Another</span>
                       <span className="sm:hidden">Another</span>
                     </Button>
                  </Link>
                </CardFooter>
              </Card>
            )
          })}

          {convertedRequests.length > 0 && (
            <div className="mt-8">
              <StatefulCollapsible title={`Converted Orders (${convertedRequests.length})`}>
                <div className="space-y-4 mt-4">
                  {convertedRequests.map(req => (
                    <div key={req._id} className="bg-gray-50 rounded-xl p-4 flex justify-between items-center opacity-75 border border-gray-200">
                      <div>
                        <p className="font-medium text-gray-700">Custom {req.category} Request</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" />
                          Converted on {format(new Date(req.updatedAt || req.date), "PPP")}
                        </p>
                      </div>
                      {req.convertedOrderId ? (
                        <Link href="#orders">
                           <Button variant="text" className="text-primary h-auto p-0 flex items-center gap-1 font-semibold">
                             See Order <ExternalLink className="w-3 h-3" />
                           </Button>
                        </Link>
                      ) : (
                        <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200">Converted</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </StatefulCollapsible>
            </div>
          )}

          {rejectedRequests.length > 0 && (
            <div className="mt-4">
              <StatefulCollapsible title={`Rejected Requests (${rejectedRequests.length})`}>
                <div className="space-y-4 mt-4">
                  {rejectedRequests.map(req => (
                    <Card key={req._id} className="overflow-hidden shadow-sm border border-red-200 bg-red-50/50">
                      <CardHeader className="bg-red-50 pb-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                            <h3 className="font-heading text-lg font-bold text-red-900">
                              Custom {req.category} Request
                            </h3>
                            <p className="text-sm text-red-700 flex items-center gap-1 mt-1">
                              <Calendar className="w-3 h-3" />
                              ID: {req._id.toString().slice(-6).toUpperCase()} • Submitted {format(new Date(req.createdAt || req.date), "PPP")}
                            </p>
                          </div>
                          <Badge variant="destructive">Rejected</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4 pb-4">
                        <div className="text-sm text-muted-foreground italic">
                           Reason: {req.rejectionReason || 'No reason was provided'}
                        </div>
                      </CardContent>
                      <CardFooter className="bg-red-50/50 border-t border-red-100 p-4 flex justify-end">
                        <Link href={`/custom-order?category=${req.category}`}>
                           <Button variant="outline" size="sm" className="flex items-center gap-1 border-red-200 text-red-700 hover:bg-red-100">
                             <PlusCircle className="w-4 h-4" />
                             Start New Request
                           </Button>
                        </Link>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </StatefulCollapsible>
            </div>
          )}
        </>
      )}
    </div>
  );
}
