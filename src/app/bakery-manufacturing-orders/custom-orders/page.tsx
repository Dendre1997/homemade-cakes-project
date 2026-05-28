import clientPromise from "@/lib/db";
import { MessageCircle } from "lucide-react";
import { CustomOrder } from "@/types";
import { CustomOrderCard } from "@/components/admin/custom-orders/CustomOrderCard";
import { CompactCustomOrderRow } from "@/components/admin/custom-orders/CompactCustomOrderRow";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious 
} from "@/components/ui/shadcn-carousel";
import RefreshTrigger from "@/components/admin/RefreshTrigger";

// Ensure Next.js does not statically cache this page
export const dynamic = 'force-dynamic';
export const revalidate = 0; 

export default async function CustomOrdersListPage() {
  let customOrders: CustomOrder[] = [];
  let pendingOrders: CustomOrder[] = [];
  let convertedOrders: CustomOrder[] = [];
  let rejectedOrders: CustomOrder[] = [];
  let errorMsg: string | null = null;

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const rawOrders = await db
      .collection("custom_orders")
      .find({})
      .sort({ date: 1 }) // Upcoming first
      .toArray();

    customOrders = rawOrders.map((order) => {
      return {
        ...order,
        _id: order._id.toString(),
        // Legacy schema fallbacks to prevent undefined UI errors
        contact: order.contact || {
          name: order.customerName || "Legacy Customer",
          email: order.customerEmail || "",
          phone: order.customerPhone || ""
        },
        date: order.date || order.eventDate,
        category: order.category || order.eventType || "Unknown",
        details: order.details || {
          size: order.servingSize || "",
          flavor: order.flavorPreferences || "",
          textOnCake: "",
          designNotes: order.description || ""
        },
        referenceImages: order.referenceImages || order.referenceImageUrls || []
      };
    }) as unknown as CustomOrder[];

    pendingOrders = customOrders.filter(o => o.status === 'pending_review' || !o.status);
    convertedOrders = customOrders.filter(o => o.status === 'converted');
    rejectedOrders = customOrders.filter(o => o.status === 'rejected');
  } catch (error) {
    console.error("Failed to fetch custom orders:", error);
    errorMsg = "We timed out trying to connect to the database. This frequently occurs during cold starts. Please reload the page to try again.";
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto min-h-screen bg-background">
      {/* Background auto-polling (every 30 seconds) */}
      <RefreshTrigger intervalMs={30000} />

      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-primary">Custom Order Requests</h1>
          <p className="text-muted-foreground">Manage incoming leads and convert them to production orders.</p>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="bg-card px-4 py-2.5 rounded-xl shadow-sm border border-border flex flex-col items-center min-w-[100px]">
                <span className="text-2xl font-bold text-primary leading-none">{customOrders.length}</span>
                <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mt-1">Total Leads</span>
            </div>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive flex items-center gap-3">
          <div className="text-lg">⚠️</div>
          <div>
            <span className="font-semibold">Database Connection Issue: </span>
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      <div>
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="pending">Pending ({pendingOrders.length})</TabsTrigger>
            <TabsTrigger value="converted">Converted ({convertedOrders.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejectedOrders.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-6">
            {pendingOrders.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-gray-500 flex flex-col items-center">
                <MessageCircle className="w-12 h-12 mb-4 opacity-20" />
                <h3 className="text-lg font-medium">No Pending Requests</h3>
                <p>Wait for customers to submit the "Dream Cake" form.</p>
              </div>
            ) : (
              <>
                {/* Mobile Carousel (sm and below) */}
                <div className="block md:hidden">
                  <Carousel className="w-full">
                    <CarouselContent>
                      {pendingOrders.map((order) => (
                        <CarouselItem key={order._id} className="basis-[85%]">
                          <CustomOrderCard order={order} />
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <div className="flex justify-center gap-4 mt-6">
                       <CarouselPrevious className="static translate-y-0" />
                       <CarouselNext className="static translate-y-0" />
                    </div>
                  </Carousel>
                </div>

                {/* Desktop Grid (md and up) */}
                <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {pendingOrders.map((order) => (
                    <CustomOrderCard key={order._id} order={order} />
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="converted" className="space-y-4">
            {convertedOrders.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-gray-500 flex flex-col items-center">
                <h3 className="text-lg font-medium">No Converted Requests</h3>
              </div>
            ) : (
              convertedOrders.map((order) => (
                <CompactCustomOrderRow key={order._id} order={order} type="converted" />
              ))
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {rejectedOrders.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-gray-500 flex flex-col items-center">
                <h3 className="text-lg font-medium">No Rejected Requests</h3>
              </div>
            ) : (
              rejectedOrders.map((order) => (
                <CompactCustomOrderRow key={order._id} order={order} type="rejected" />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
