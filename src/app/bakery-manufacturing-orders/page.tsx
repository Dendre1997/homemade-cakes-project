import clientPromise from "@/lib/db";
import { Order, OrderStatus } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
  DollarSign, 
  Clock, 
  Plus, 
  Calendar, 
  Utensils,
  MapPin,
    Truck,
  ShoppingCart
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow, isToday, format } from "date-fns";
import InboxQueue from "@/components/admin/dashboard/InboxQueue";
import PendingOrdersCard from "@/components/admin/dashboard/PendingOrdersCard";
import ProductionQueue from "@/components/admin/dashboard/ProductionQueue";

// ...

async function getDashboardData() {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME);
  const collection = db.collection<Order>("orders");

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());


  const revenueOrders = await collection.find({
    createdAt: { $gte: startOfToday },
    status: { $ne: OrderStatus.CANCELLED }
  }).toArray();

  const revenueToday = revenueOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

  const pendingConfirmationOrders = await collection.find({
    status: OrderStatus.PENDING_CONFIRMATION
  })
  .sort({ createdAt: 1 }) 
  .toArray();

  const inboxOrdersRaw = await collection.find({
     status: { $in: [OrderStatus.NEW, OrderStatus.PAID] }
  })
  .sort({ createdAt: 1 })
  .toArray();
  
  const inboxOrders = inboxOrdersRaw.map(order => ({
      ...order,
      _id: order._id.toString(),
      deliveryInfo: {
          ...order.deliveryInfo,
          deliveryDates: order.deliveryInfo.deliveryDates.map(d => ({
              ...d,
              date: new Date(d.date)
          }))
      }
  }));

  const nextDeliveries = await collection.find({
    "deliveryInfo.deliveryDates.date": { $gte: startOfToday },
    status: { $in: [OrderStatus.NEW, OrderStatus.PAID, OrderStatus.IN_PROGRESS, OrderStatus.READY] }
  })
  .sort({ "deliveryInfo.deliveryDates.date": 1 })
  .limit(5)
  .toArray();

  const productionQueue = nextDeliveries.map(order => {
     const sortedDates = order.deliveryInfo.deliveryDates
        .map(d => ({ ...d, dateObj: new Date(d.date) }))
        .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
     
     const upcoming = sortedDates.filter(d => d.dateObj >= startOfToday);
     const past = sortedDates.filter(d => d.dateObj < startOfToday);
     
     const reorderedDates = [...upcoming, ...past].map(d => ({
         ...d,
         date: d.dateObj
     }));
     
     return {
        ...order,
        _id: order._id.toString(),
        deliveryInfo: {
            ...order.deliveryInfo,
            deliveryDates: reorderedDates
        }
     };
  });

  
  return {
    revenueToday,
    ordersCountToday: revenueOrders.length,
    pendingConfirmationOrders: JSON.parse(JSON.stringify(pendingConfirmationOrders)),
    inboxOrders: JSON.parse(JSON.stringify(inboxOrders)),
    productionQueue: JSON.parse(JSON.stringify(productionQueue))
  };
}


export default async function AdminDashboard() {
  const data = await getDashboardData();
  const { revenueToday, ordersCountToday, pendingConfirmationOrders, inboxOrders, productionQueue } = data;
  
  const nextOrder = productionQueue[0];
  const nextDeliveryItem = nextOrder ? {
      customerName: nextOrder.customerInfo.name,
      deliveryDate: nextOrder.deliveryInfo.deliveryDates[0].date,
      method: nextOrder.deliveryInfo.method
  } : null;

  return (
    <div className="space-y-8 p-6 pb-20 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-primary">
            My Bakery
          </h1>
          <p className="text-muted-foreground mt-1">
            Overview of daily baking and orders
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 flex-col md:flex-row">
          <Link href="/bakery-manufacturing-orders/orders/new" >
            <Button className="gap-2 shadow-sm">
              <Plus className="w-4 h-4" /> Manual Order
            </Button>
          </Link>
          <Link href="/bakery-manufacturing-orders/products/create">
            <Button variant="outline" className="gap-2 shadow-sm bg-white">
              <Plus className="w-4 h-4" />
              New Product
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenue Today
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${revenueToday.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              You have {ordersCountToday} new orders for today
            </p>
          </CardContent>
        </Card>

        <PendingOrdersCard pendingOrders={pendingConfirmationOrders} />

        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {nextDeliveryItem?.method === "pickup"
                ? "Next Pickup"
                : "Next Delivery"}
            </CardTitle>
            {nextDeliveryItem?.method === "pickup" ? (
              <MapPin className="h-4 w-4 text-blue-500" />
            ) : (
              <Truck className="h-4 w-4 text-blue-500" />
            )}
          </CardHeader>
          <CardContent>
            {nextDeliveryItem ? (
              <>
                <div className="text-lg font-bold truncate">
                  {format(
                    new Date(nextDeliveryItem.deliveryDate),
                    "EEEE, MMM do"
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {nextDeliveryItem.customerName} •{" "}
                  {format(new Date(nextDeliveryItem.deliveryDate), "h:mm a")}
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground py-1">
                No upcoming tasks
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-heading font-semibold text-primary flex items-center gap-2">
              <span className="w-2 h-8 bg-orange-500 rounded-sm inline-block"></span>
              Inbox ({inboxOrders.length})
            </h2>
            <Link
              href="/bakery-manufacturing-orders/orders"
              className="text-sm text-primary hover:underline"
            >
              View All
            </Link>
          </div>

          <InboxQueue orders={inboxOrders} />
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-heading font-semibold text-primary flex items-center gap-2">
              <Utensils className="w-5 h-5" />
              What to Bake Next
            </h2>
            <span className="text-sm text-muted-foreground">Next 5 tasks</span>
          </div>

          <ProductionQueue orders={productionQueue} />
        </section>
      </div>
    </div>
  );
}
