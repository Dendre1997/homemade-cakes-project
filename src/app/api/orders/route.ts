import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/adminApp";
import clientPromise from "@/lib/db";
import { Order, OrderStatus, CartItem, OrderItem, Discount } from "@/types";
import { ObjectId } from "mongodb";
import { Resend } from "resend";
import { NewOrderEmail } from "@/emails/NewOrderEmail";
import OrderConfirmationEmail from "@/emails/OrderConfirmationEmail";
import PendingOrderAdminEmail  from "@/emails/PendingOrderAdminEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

import { calculateOrderPricing } from "@/lib/pricing";

// Helper to prevent NaN and ensure 2 decimals
const safePrice = (val: any) => {
  const num = Number(val);
  return isNaN(num) ? 0 : Number(num.toFixed(2));
};

export async function POST(request: NextRequest) {
  try {
    const orderData = await request.json();

    // extract promo code if present
    const promoCode = orderData.promoCode || null;

    if (orderData.status === OrderStatus.PENDING_CONFIRMATION) {
      console.log("Processing order requiring confirmation...");

      const {
        customerInfo,
        deliveryInfo,
        items,
        totalAmount: clientTotal,
      } = orderData as {
        customerInfo: Order["customerInfo"];
        deliveryInfo: {
          method: "pickup" | "delivery";
          address?: string;
          deliveryDates: { date: Date; itemIds: string[]; timeSlot: string }[];
        };
        items: CartItem[];
        totalAmount: number;
        promoCode?: string;
      };


      if (!customerInfo || !items || items.length === 0 || !clientTotal) {
        return NextResponse.json(
          { error: "Missing required info for pending order." },
          { status: 400 }
        );
      }

      const client = await clientPromise;
      const db = client.db(process.env.MONGODB_DB_NAME);

      

      // --- SERVER-SIDE PRICING VALIDATION ---
      
      // Usage Limit Check (Optimization: fail fast)
      if (promoCode) {
         const discount = await db.collection<Discount>("discounts").findOne({ 
           trigger: "code", 
           code: promoCode.toUpperCase().trim(),
           isActive: true 
         });
         
         if (discount) {
           if (typeof discount.usageLimit === 'number' && discount.usageLimit > 0) {
             if (discount.usedCount >= discount.usageLimit) {
                return NextResponse.json(
                  { error: "This promo code has reached its usage limit." },
                  { status: 400 }
                );
             }
           }
         }
      }

      const pricingResult = await calculateOrderPricing(db, items, promoCode);
      
      // Map items with updated pricing + Penny Drop fix (rowTotal)
      const itemsForDb = await Promise.all(items.map(
        async (item: CartItem): Promise<OrderItem> => {
           // 1. Fetch Product to determine Type (Source of Truth)
           const product = await db.collection("products").findOne({ _id: new ObjectId(item.productId) });
           if (!product) throw new Error(`Product ${item.productId} not found`);

           const breakdown = pricingResult.itemBreakdown.find(b => b.itemId === item.id);
           
           // Base Calculation (Fallback)
           let finalPriceTotal = breakdown ? breakdown.finalPrice : (item.price * item.quantity);

           // --- SCENARIO A: SETS & COMBOS ---
           if (product.productType === 'set') {
               console.log(`[DEBUG] Processing SET: ${product.name}`);
               
               //  Safe Base & Default
               const base = safePrice(product.structureBasePrice);
               const defaultBox = safePrice(product.availableQuantityConfigs?.[0]?.price);
               
               let finalCalculatedPrice = 0;
               
               //  FIND BOX CONFIG (Hard Stop Logic)
               // The frontend passes the 'label' as the identifier now (e.g., "Box of 12")
               const incomingIdentifier = (item.selectedConfig as any)?.quantityConfigId; 
               
               if (!incomingIdentifier) {
                    console.warn(`[WARNING] Order Item '${product.name}' is missing quantityConfigId (Label). Using Base Price.`);
                    finalCalculatedPrice = base;
               } else {
                    // Normalize and Log
                    console.log(`[DEBUG] Looking for config Label: ${incomingIdentifier}`);
               
                    const selectedBoxObj = product.availableQuantityConfigs?.find((c: any) => {
                         // MATCH BY LABEL
                         return c.label && c.label.toString() === incomingIdentifier.toString();
                    });
            
                    if (selectedBoxObj) {
                        console.log(`[DEBUG] Found Config! Price: ${selectedBoxObj.price}`);
                        const selectedBoxPrice = safePrice(selectedBoxObj.price);
                
                        //   Calculate
                        if (product.comboConfig?.hasCake) {
                             // Combo Formula
                             finalCalculatedPrice = (base - defaultBox) + selectedBoxPrice;
                        } else {
                             // Simple Set Formula
                             finalCalculatedPrice = selectedBoxPrice;
                        }
                    } else {
                        console.warn(`[WARNING] Config Label '${incomingIdentifier}' NOT FOUND in product ${product._id}. Reverting to Base Price.`);
                        finalCalculatedPrice = base; 
                    }
               }
           
               // 4. Flavor Surcharge
               if (product.comboConfig?.hasCake && item.selectedConfig?.cake?.flavorId) {
                    const flavor = await db.collection('flavors').findOne({ 
                        _id: new ObjectId(item.selectedConfig.cake.flavorId) 
                    });
                    const flavorPrice = safePrice(flavor?.price);
                    if (flavorPrice > 0) {
                        console.log(`[DEBUG] Adding Flavor Surcharge: ${flavorPrice}`);
                        finalCalculatedPrice += flavorPrice;
                    }
               }
               
               return {
                  ...item,
                  quantity: Number(item.quantity),
                  productId: new ObjectId(item.productId),
                  categoryId: new ObjectId(item.categoryId),
                  
                  // SET DATA:
                  selectedConfig: item.selectedConfig, 
                  diameterId: undefined, // Explicit null for Sets
                  
                  price: safePrice(finalCalculatedPrice),
                  rowTotal: safePrice(finalCalculatedPrice * item.quantity),
                  
                  originalPrice: breakdown ? breakdown.originalPrice : undefined,
                  discountName: breakdown?.discountName || null,
                  discountId: breakdown?.discountId ? new ObjectId(breakdown.discountId).toString() : null,
               };

           } else {
               // --- SCENARIO B: STANDARD CAKE ---
               return {
                  ...item,
                  quantity: Number(item.quantity),
                  productId: new ObjectId(item.productId),
                  categoryId: new ObjectId(item.categoryId),
                  
                  // STANDARD DATA:
                  diameterId: item.diameterId ? new ObjectId(item.diameterId) : undefined,
                  selectedConfig: undefined, // Explicit null for Standard
                  
                  // PRICING
                  price: safePrice(finalPriceTotal / item.quantity),
                  rowTotal: safePrice(finalPriceTotal),
                  originalPrice: breakdown ? breakdown.originalPrice : undefined,
                  discountName: breakdown?.discountName || null,
                  discountId: breakdown?.discountId ? new ObjectId(breakdown.discountId).toString() : null,
               };
           }
        }
      ));

      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get("session")?.value;
      let customerId: ObjectId | undefined = undefined;
      if (sessionCookie) {
        const decodedToken = await adminAuth
          .verifySessionCookie(sessionCookie, true)
          .catch(() => null);
        if (decodedToken) {
          const user = await db
            .collection("users")
            .findOne({ firebaseUid: decodedToken.uid });
          if (user) customerId = user._id;
        }
      }

      const pendingOrder = {
        customerId,
        customerInfo,
        deliveryInfo: {
          method: deliveryInfo.method,
          address: deliveryInfo.address,
          deliveryDates: [],
        },
        items: itemsForDb,
        totalAmount: pricingResult.finalTotal, // Use backend calculation
        status: OrderStatus.PENDING_CONFIRMATION,
        createdAt: new Date(),
        source: 'web', // Enforce source
        discountInfo: pricingResult.appliedCode ? {
            code: pricingResult.appliedCode,
            amount: pricingResult.discountTotal,
            name: pricingResult.appliedDiscount?.name
        } : undefined
      };

      const result = await db.collection("orders").insertOne(pendingOrder);
      const orderId = result.insertedId;
      console.log(`Order ${orderId} saved with status 'pending_confirmation'.`);

      const finalPendingOrder: Order = {
        _id: orderId.toString(),
        customerId: pendingOrder.customerId?.toString(),
        customerInfo: pendingOrder.customerInfo,
        deliveryInfo: pendingOrder.deliveryInfo,
        totalAmount: pendingOrder.totalAmount,
        status: pendingOrder.status,
        createdAt: pendingOrder.createdAt,
        items: pendingOrder.items.map((item) => ({
          ...item,
          productId: item.productId?.toString(),
          categoryId: item.categoryId?.toString(),
          diameterId: item.diameterId?.toString(),
          discountId: item.discountId?.toString() || null,
        })),
        discountInfo: pendingOrder.discountInfo
      };

      try {
        await resend.emails.send({
          from: "Dilna Cakes <onboarding@resend.dev>",
          to: process.env.ADMIN_EMAIL || "",
          subject: `ACTION REQUIRED: Order #${finalPendingOrder._id.toString().slice(-6).toUpperCase()} Needs Confirmation`,
          react: PendingOrderAdminEmail({ order: finalPendingOrder }),
          // react: NewOrderEmail({ order: finalPendingOrder, needsConfirmation: true }),
        });
        console.log(`Admin notification sent for pending order ${orderId}.`);
      } catch (emailError) {
        console.error("Error sending admin notification email:", emailError);
      }

      return NextResponse.json(
        {
          message: "Order submitted for confirmation",
          orderId: orderId,
          status: OrderStatus.PENDING_CONFIRMATION,
        },
        { status: 201 }
      );
    } else {
      console.log("Processing standard order..."); // Log entry
      const {
        customerInfo,
        deliveryInfo,
        items,
        totalAmount: clientTotal,
      } = orderData as {
        customerInfo: Order["customerInfo"];
        deliveryInfo: {
          method: "pickup" | "delivery";
          address?: string;
          deliveryDates: {
            date: Date | string;
            itemIds: string[];
            timeSlot: string;
          }[];
        };
        items: CartItem[];
        totalAmount: number;
        promoCode?: string;
      };

      if (
        !customerInfo ||
        !deliveryInfo ||
        !deliveryInfo.deliveryDates ||
        deliveryInfo.deliveryDates.length === 0 ||
        !items ||
        items.length === 0 ||
        !clientTotal
      ) {
        return NextResponse.json(
          { error: "Missing required order information." },
          { status: 400 }
        );
      }

      const client = await clientPromise;
      const db = client.db(process.env.MONGODB_DB_NAME);
      
      // --- SERVER-SIDE PRICING VALIDATION ---
      
      // Usage Limit Check (Optimization: fail fast)
      if (promoCode) {
         const discount = await db.collection<Discount>("discounts").findOne({ 
           trigger: "code", 
           code: promoCode.toUpperCase().trim(),
           isActive: true 
         });
         
         if (discount) {
           if (typeof discount.usageLimit === 'number' && discount.usageLimit > 0) {
             if (discount.usedCount >= discount.usageLimit) {
                return NextResponse.json(
                  { error: "This promo code has reached its usage limit." },
                  { status: 400 }
                );
             }
           }
         }
      }

      const pricingResult = await calculateOrderPricing(db, items, promoCode);

      // Map items with updated pricing + Penny Drop fix (rowTotal)
      const itemsForDb = await Promise.all(items.map(
        async (item: CartItem): Promise<OrderItem> => {
           // 1. Fetch Product to determine Type (Source of Truth)
           const product = await db.collection("products").findOne({ _id: new ObjectId(item.productId) });
           if (!product) throw new Error(`Product ${item.productId} not found`);

           const breakdown = pricingResult.itemBreakdown.find(b => b.itemId === item.id);
           
           // Base Calculation (Fallback)
           let finalPriceTotal = breakdown ? breakdown.finalPrice : (item.price * item.quantity);

           // --- SCENARIO A: SETS & COMBOS ---
           if (product.productType === 'set') {
               console.log(`[DEBUG] Processing SET: ${product.name}`);

               // 1. Safe Base & Default
               const base = safePrice(product.structureBasePrice);
               const defaultBox = safePrice(product.availableQuantityConfigs?.[0]?.price);
               
               let finalCalculatedPrice = 0;
               
               // FIND BOX CONFIG (Hard Stop Logic)
               const incomingIdentifier = (item.selectedConfig as any)?.quantityConfigId;
               
               if (!incomingIdentifier) {
                    console.warn(`[WARNING] Order Item '${product.name}' is missing quantityConfigId (Label). Using Base Price.`);
                    finalCalculatedPrice = base;
               } else {
                    // Normalize and Log
                    console.log(`[DEBUG] Looking for config Label: ${incomingIdentifier}`);
               
                    const selectedBoxObj = product.availableQuantityConfigs?.find((c: any) => {
                         // MATCH BY LABEL
                         return c.label && c.label.toString() === incomingIdentifier.toString();
                    });
            
                    if (selectedBoxObj) {
                        console.log(`[DEBUG] Found Config! Price: ${selectedBoxObj.price}`);
                        const selectedBoxPrice = safePrice(selectedBoxObj.price);
                
                        //  Calculate
                        if (product.comboConfig?.hasCake) {
                             // Combo Formula
                             finalCalculatedPrice = (base - defaultBox) + selectedBoxPrice;
                        } else {
                             // Simple Set Formula
                             finalCalculatedPrice = selectedBoxPrice;
                        }
                    } else {
                        console.warn(`[WARNING] Config Label '${incomingIdentifier}' NOT FOUND in product ${product._id}. Reverting to Base Price.`);
                        finalCalculatedPrice = base; 
                    }
               }
           
               // 4. Flavor Surcharge
               if (product.comboConfig?.hasCake && item.selectedConfig?.cake?.flavorId) {
                    const flavor = await db.collection('flavors').findOne({ 
                        _id: new ObjectId(item.selectedConfig.cake.flavorId) 
                    });
                    const flavorPrice = safePrice(flavor?.price);
                    if (flavorPrice > 0) {
                        console.log(`[DEBUG] Adding Flavor Surcharge: ${flavorPrice}`);
                        finalCalculatedPrice += flavorPrice;
                    }
               }
               
               return {
                  ...item,
                  quantity: Number(item.quantity),
                  productId: new ObjectId(item.productId),
                  categoryId: new ObjectId(item.categoryId),
                  
                  // SET DATA:
                  selectedConfig: item.selectedConfig, 
                  diameterId: undefined, // Explicit null for Sets
                  
                  // PRICING (Source of Truth: Shared Logic with Discounts)
                  price: safePrice(breakdown ? breakdown.finalPrice : finalCalculatedPrice),
                  rowTotal: safePrice(breakdown ? breakdown.finalPrice * item.quantity : finalCalculatedPrice * item.quantity),
                  
                  // Metadata
                  originalPrice: breakdown ? breakdown.originalPrice : undefined,
                  discountName: breakdown?.discountName || null,
                  discountId: breakdown?.discountId ? new ObjectId(breakdown.discountId).toString() : null,
               };

           } else {
               // --- SCENARIO B: STANDARD CAKE ---
               return {
                  ...item,
                  quantity: Number(item.quantity),
                  productId: new ObjectId(item.productId),
                  categoryId: new ObjectId(item.categoryId),
                  
                  // STANDARD DATA:
                  diameterId: item.diameterId ? new ObjectId(item.diameterId) : undefined,
                  selectedConfig: undefined, // Explicit null for Standard
                  
                  // PRICING
                  price: safePrice(finalPriceTotal / item.quantity),
                  rowTotal: safePrice(finalPriceTotal),
                  originalPrice: breakdown ? breakdown.originalPrice : undefined,
                  discountName: breakdown?.discountName || null,
                  discountId: breakdown?.discountId ? new ObjectId(breakdown.discountId).toString() : null,
               };
           }
        }
      ));


      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get("session")?.value;
      let customerId: ObjectId | undefined = undefined;
      if (sessionCookie) {
        const decodedToken = await adminAuth
          .verifySessionCookie(sessionCookie, true)
          .catch(() => null);
        if (decodedToken) {
          const user = await db
            .collection("users")
            .findOne({ firebaseUid: decodedToken.uid });
          if (user) customerId = user._id;
        }
      }

      // Force Server-Side Total Calculation
      const calculatedTotal = itemsForDb.reduce((sum, item) => sum + (item.rowTotal || 0), 0);
      console.log(`[DEBUG] Server Calculated Total: ${calculatedTotal} (Client sent: ${clientTotal})`);

      const newOrder = {
        customerId,
        customerInfo,
        deliveryInfo: {
          method: deliveryInfo.method,
          address: deliveryInfo.address,
          deliveryDates: deliveryInfo.deliveryDates.map((d) => ({
            ...d,
            date: new Date(d.date),
          })),
        },
        items: itemsForDb,
        totalAmount: safePrice(calculatedTotal), // Force Server Total
        status: OrderStatus.NEW,
        createdAt: new Date(),
        source: 'web', // Enforce source
        discountInfo: pricingResult.appliedCode ? {
            code: pricingResult.appliedCode,
            amount: pricingResult.discountTotal,
            name: pricingResult.appliedDiscount?.name
        } : undefined
      };

      const result = await db.collection("orders").insertOne(newOrder);
      const orderId = result.insertedId;
      console.log(`Standard order ${orderId} created with status 'new'.`);

      const finalOrder: Order = {
        _id: orderId.toString(),
        customerId: newOrder.customerId?.toString(),
        customerInfo: newOrder.customerInfo,
        deliveryInfo: newOrder.deliveryInfo,
        totalAmount: newOrder.totalAmount,
        status: newOrder.status,
        createdAt: newOrder.createdAt,
        items: newOrder.items.map((item) => ({
          ...item,
          productId: item.productId?.toString(),
          categoryId: item.categoryId?.toString(),
          diameterId: item.diameterId?.toString(),
          discountId: item.discountId?.toString() || null,
        })),
        discountInfo: newOrder.discountInfo
      };

      try {
        await Promise.all([
          resend.emails.send({
            from: "Homemade Cakes <onboarding@resend.dev>",
            to: "anastasiiadilna@gmail.com",
            subject: `New Order #${finalOrder._id.toString().slice(-6).toUpperCase()}`,
            react: NewOrderEmail({ order: finalOrder }),
          }),
          resend.emails.send({
            from: "Homemade Cakes <onboarding@resend.dev>",
            to: finalOrder.customerInfo.email,
            subject: `Your Order Confirmation #${finalOrder._id.toString().slice(-6).toUpperCase()}`,
            react: OrderConfirmationEmail({ order: finalOrder }),
          }),
        ]);
        console.log(`Confirmation emails sent for order ${orderId}.`);
      } catch (emailError) {
        console.error("Error sending confirmation emails:", emailError);
      }
      
      // --- ATOMIC INCREMENT FOR USAGE LIMIT ---
      if (pricingResult.appliedCode && pricingResult.appliedDiscount) {
         await db.collection("discounts").updateOne(
           { _id: new ObjectId(pricingResult.appliedDiscount._id) },
           { $inc: { usedCount: 1 } }
         );
         console.log(`Incremented usedCount for discount code: ${pricingResult.appliedCode}`);
      }

      return NextResponse.json(
        { message: "Order created", orderId: orderId },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("Error creating order:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Internal Server Error", details: errorMessage },
      { status: 500 }
    );
  }
}


export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const orders = await db
      .collection("orders")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
