import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth } from "@/lib/firebase/adminApp";
import clientPromise from "@/lib/db";
import { getUserOrders } from "@/lib/api/orders";
import { Order, OrderStatus } from "@/types";
import ClientOrderCard from "@/components/profile/ClientOrderCard";
import ProfileLogoutButton from "@/components/profile/ProfileLogoutButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import ProductCard from "@/components/(client)/ProductCard";
import { ObjectId } from "mongodb";
import ProfileGuard from "@/components/auth/ProfileGuard";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;

  if (!sessionCookie) {
    redirect("/login");
  }

  let userOrders: Order[] = [];
  let userEmail = "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let diameters: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let user: any = null;

  try {
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    userEmail = decodedToken.email || "";

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    
    // Convert Firebase UID to Mongo User ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user = await db.collection("users").findOne({ firebaseUid: decodedToken.uid }) as any;
    const diametersData = await db.collection("diameters").find().toArray();
    diameters = JSON.parse(JSON.stringify(diametersData));

    if (user) {
        userOrders = await getUserOrders(user._id.toString());
    } else {
        console.error("Profile Error: User authenticated but not found in DB.", decodedToken.uid);
        redirect("/login");
    }

  } catch (error) {
    console.error("Profile Page Auth Error:", error);
    redirect("/login");
  }

    // Split Orders
  const activeStatuses = [
    OrderStatus.NEW,
    OrderStatus.PAID,
    OrderStatus.IN_PROGRESS,
    OrderStatus.READY,
    OrderStatus.PENDING_CONFIRMATION
  ];

  const activeOrders = userOrders.filter(o => activeStatuses.includes(o.status));
  const historyOrders = userOrders.filter(o => !activeStatuses.includes(o.status)); // Delivered, Cancelled
  
  // --- FETCH HISTORY PRODUCTS (Buy Again) ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pastProducts: any[] = [];
  
  // Use the optimized field on User model if available
  const purchasedProductIds = user?.purchasedProductIds || [];
  

  if (purchasedProductIds.length > 0) {
      try {
          const client = await clientPromise;
          const db = client.db(process.env.MONGODB_DB_NAME);
          
          const idsArray = purchasedProductIds.map((id: string) => new ObjectId(id));
          const productsRaw = await db.collection("products").aggregate([
              { $match: { _id: { $in: idsArray } } },
              {
                  $lookup: {
                      from: "categories",
                      localField: "categoryId",
                      foreignField: "_id",
                      as: "category"
                  }
              },
              { $unwind: "$category" }
          ]).toArray();
          
          // Serialize for Client Component (ProductCard)
          pastProducts = productsRaw.map((product: any) => ({
             ...product,
             _id: product._id.toString(),
             categoryId: product.categoryId.toString(),
             collectionIds: (product.collectionIds || []).map((id: ObjectId) => id.toString()),
             seasonalEventIds: (product.seasonalEventIds || []).map((id: ObjectId) => id.toString()),
             availableFlavorIds: (product.availableFlavorIds || []).map((id: ObjectId) => id.toString()),
             allergenIds: (product.allergenIds || []).map((id: ObjectId) => id.toString()),
             availableDiameterConfigs: (product.availableDiameterConfigs || []).map((config: any) => ({
                 ...config,
                 diameterId: config.diameterId.toString()
             })),
             category: {
                 ...product.category,
                 _id: product.category._id.toString()
             }
          }));

      } catch (err) {
          console.error("Error fetching history products:", err);
      }
  } else if (historyOrders.length > 0) {
      // Fallback: If migration hasn't run yet, try existing logic from orders
      const productIds = new Set<string>();
      historyOrders.forEach(order => {
            order.items.forEach(item => {
                if (item.productId) productIds.add(item.productId);
            });
        });
      
      if (productIds.size > 0) {
        try {
            const client = await clientPromise;
            const db = client.db(process.env.MONGODB_DB_NAME);
            const idsArray = Array.from(productIds).map(id => new ObjectId(id));
            const productsRaw = await db.collection("products").aggregate([
                { $match: { _id: { $in: idsArray } } },
                { $lookup: { from: "categories", localField: "categoryId", foreignField: "_id", as: "category" } },
                { $unwind: "$category" }
            ]).toArray();
            
            pastProducts = productsRaw.map((product: any) => ({
                ...product,
                _id: product._id.toString(),
                categoryId: product.categoryId.toString(),
                availableDiameterConfigs: (product.availableDiameterConfigs || []).map((config: any) => ({
                    ...config,
                    diameterId: config.diameterId.toString()
                })),
                category: { ...product.category, _id: product.category._id.toString() }
            }));
            
        } catch(err) { console.error("Error fetching fallback history:", err); }
      }
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
        <ProfileGuard>
          {/* --- Header --- */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div>
                  <h1 className="font-heading text-3xl font-bold text-primary">Your Profile</h1>
                  <p className="text-muted-foreground">Welcome back, {userEmail}</p>
              </div>
              <ProfileLogoutButton />
          </div>

          {/* --- Orders Tabs --- */}
          <Tabs defaultValue="active" className="w-full">
              <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-8">
                  <TabsTrigger value="active">Orders ({activeOrders.length})</TabsTrigger>
                  <TabsTrigger value="history">Buy Again</TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="space-y-6">
                  {activeOrders.length > 0 ? (
                      activeOrders.map(order => (
                          <ClientOrderCard key={order._id.toString()} order={order} diameters={diameters} />
                      ))
                  ) : (
                      <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                          <p className="text-lg text-gray-500 mb-4">No active orders right now.</p>
                          <Link href="/products">
                              <Button>Browse Menu</Button>
                          </Link>
                      </div>
                  )}
              </TabsContent>

              <TabsContent value="history">
                  {pastProducts.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {pastProducts.map((product) => (
                              <ProductCard key={product._id.toString()} product={product} /> 
                          ))}
                      </div>
                  ) : (
                      <div className="text-center py-12 text-gray-500">
                          <p>No past purchases found.</p>
                          <Link href="/products" className="mt-4 inline-block">
                              <Button variant="outline">Start Shopping</Button>
                          </Link>
                      </div>
                  )}
              </TabsContent>
          </Tabs>
        </ProfileGuard>
      </div>
    </div>
  );
}
