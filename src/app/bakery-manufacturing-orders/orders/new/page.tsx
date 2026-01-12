"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAlert } from "@/contexts/AlertContext";
import { Button } from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/Spinner";
import { Trash2, Calendar as CalendarIcon, X } from "lucide-react";
import { ProductPicker } from "@/components/admin/ProductPicker";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { StandardProductForm } from "@/components/admin/orders/StandardProductForm";
import { SetProductForm } from "@/components/admin/orders/SetProductForm";
import { ProductWithCategory, Flavor, Diameter, OrderItem } from "@/types";
import CustomOrderItemForm from "@/components/admin/orders/CustomOrderItemForm";

export default function ManualOrderPage() {
  const router = useRouter();
  const { showAlert } = useAlert();

  // --- Data Loading ---
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [allFlavors, setAllFlavors] = useState<Flavor[]>([]);
  const [allDiameters, setAllDiameters] = useState<Diameter[]>([]); 
  const [isLoadingData, setIsLoadingData] = useState(true);

  // --- Form State ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  // Customer
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  
  // Meta
  const [source, setSource] = useState("instagram");
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "delivery">("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState("10:00 - 12:00");
  const [isPaid, setIsPaid] = useState(false);

  // Date Picker State
  const [deliveryDate, setDeliveryDate] = useState<Date | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // --- Cart / Items State ---
  const [items, setItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"catalog" | "custom">("catalog");

  // Catalog Item Builder State
  const [selectedProduct, setSelectedProduct] = useState<ProductWithCategory | null>(null);

  // Custom Item Builder State


  // --- Fetch Initial Data ---
  useEffect(() => {
    async function fetchData() {
      try {
        const [prodRes, flavRes, diamRes] = await Promise.all([
            fetch("/api/admin/products?context=admin"), 
            fetch("/api/admin/flavors"), 
            fetch("/api/admin/diameters")
        ]);
        
        if (prodRes.ok) {
             const pData = await prodRes.json();
             setProducts(pData); 
        }
        if (flavRes.ok) setAllFlavors(await flavRes.json());
        if (diamRes.ok) setAllDiameters(await diamRes.json());
      } catch (e) {
        console.error("Failed to load catalog data", e);
        showAlert("Failed to load catalog data", "error");
      } finally {
        setIsLoadingData(false);
      }
    }
    fetchData();
  }, [showAlert]);

  // --- Logic for Dependent States ---
  
  // When Product Changes
  const handleProductSelect = async (productIds: string[]) => {
      const productId = productIds[productIds.length - 1]; 
      
      if (!productId) {
          setSelectedProduct(null);
          return;
      }

      // 1. Set Loading UI for Dependent Fields
      setIsLoadingDetails(true);

      // 2. Fetch Full Product Details
      try {
           const res = await fetch(`/api/products/${productId}`);
           if (!res.ok) throw new Error("Failed to fetch product details");
           
           const fullProduct: ProductWithCategory = await res.json();
           setSelectedProduct(fullProduct); 
      } catch (e) {
          console.error(e);
          showAlert("Could not load product details", "error");
      } finally {
          setIsLoadingDetails(false);
      }
  };

  const removeItem = (index: number) => {
      const newItems = [...items];
      newItems.splice(index, 1);
      setItems(newItems);
  }

  const calculateGrandTotal = () => {
      return items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }

  const handleSubmit = async () => {
      if (!customerPhone || items.length === 0) {
          showAlert("Customer Phone and at least 1 Item are required.", "warning");
          return;
      }
      if (!deliveryDate) {
           showAlert("Delivery Date is required.", "warning");
           return;
      }

      setIsSubmitting(true);

      const payload = {
          customerInfo: {
              name: customerName || "Guest",
              email: customerEmail || `no-email-${Date.now()}@placeholder.com`,
              phone: customerPhone
          },
          deliveryInfo: {
              method: deliveryMethod,
              address: deliveryMethod === 'delivery' ? deliveryAddress : "Pickup",
              deliveryDates: [
                  { 
                      date: deliveryDate, 
                      itemIds: items.map(i => i.id), 
                      timeSlot: deliveryTimeSlot
                  }
              ]
          },
          items: items,
          source: source,
          isPaid: isPaid
      };

      try {
          const res = await fetch("/api/admin/orders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
          });

          if (!res.ok) throw new Error("Failed to create order");
          
          const data = await res.json();
          showAlert("Order created successfully!", "success");
          router.push(`/bakery-manufacturing-orders/orders/${data.orderId}`); // Go to details
      } catch (e) {
          console.error(e);
          showAlert("Error creating order", "error");
      } finally {
          setIsSubmitting(false);
      }
  };

  if (isLoadingData) return (
     <div className="flex justify-center items-center h-screen">
          <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
     </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto p-6">
      <Button
        variant="ghost"
        className="w-full sm:w-auto justify-end"
        onClick={() => router.push("/bakery-manufacturing-orders/orders")}
      >
        <ArrowLeft className="w-4 h-4" /> Back to All Orders
      </Button>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold font-heading text-primary">
          New Manual Order
        </h1>
        <div className="text-xl font-bold text-accent">
          Total: ${calculateGrandTotal().toFixed(2)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: Customer & Meta */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-border">
            <h3 className="font-bold text-lg mb-4 text-primary">
              1. Customer Details
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Phone Number *
                </label>
                <input
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-accent outline-none"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+1 234 567 8900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Customer Name
                </label>
                <input
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-primary outline-none"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Email (Optional)
                </label>
                <input
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-primary outline-none"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-border">
            <h3 className="font-bold text-lg mb-4 text-primary">
              2. Delivery Logistics
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Order Source
                </label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="Select Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">Instagram Direct</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="phone">Phone Call</SelectItem>
                    <SelectItem value="walk_in">Walk-in</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <div className="relative">
                  <button
                    className="w-full p-2 border rounded-md flex items-center justify-between hover:bg-gray-50 text-left"
                    onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                  >
                    <span
                      className={
                        deliveryDate ? "text-primary" : "text-gray-400"
                      }
                    >
                      {deliveryDate
                        ? format(deliveryDate, "PPP")
                        : "Select Date..."}
                    </span>
                    <CalendarIcon className="w-4 h-4 text-primary" />
                  </button>

                  {isCalendarOpen && (
                    <div className="absolute top-full left-0 z-50 mt-2 w-full max-w-[320px]">
                      <div className="bg-white rounded-lg shadow-xl border p-2">
                        <div className="flex justify-end mb-2">
                          <button
                            onClick={() => setIsCalendarOpen(false)}
                            className="p-1 hover:bg-gray-100 rounded-full"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <CustomDatePicker
                          selected={deliveryDate || undefined}
                          onSelect={(date) => {
                            if (date) {
                              setDeliveryDate(date);
                              setIsCalendarOpen(false);
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Method</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDeliveryMethod("pickup")}
                    className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors ${deliveryMethod === "pickup" ? "bg-accent text-white border-accent" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                  >
                    Pickup
                  </button>
                  <button
                    onClick={() => setDeliveryMethod("delivery")}
                    className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors ${deliveryMethod === "delivery" ? "bg-accent text-white border-accent" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                  >
                    Delivery
                  </button>
                </div>
              </div>
              {deliveryMethod === "delivery" && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Address
                  </label>
                  <textarea
                    className="w-full p-2 border rounded-md"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    rows={2}
                  />
                </div>
              )}
              <div className="pt-2 border-t">
                <label className="flex items-center gap-2 font-bold text-primary cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isPaid}
                    onChange={(e) => setIsPaid(e.target.checked)}
                    className="w-5 h-5 accent-accent"
                  />
                  Mark as Paid
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Item Builder & Cart */}
        <div className="lg:col-span-2 space-y-6">
          {/* BUILDER */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-border">
            <h3 className="font-bold text-lg mb-4 text-primary">
              3. Order Items
            </h3>
            <div className="flex gap-2 mb-6 border-b pb-2">
              <button
                className={`pb-2 px-4 font-bold transition-colors ${activeTab === "catalog" ? "border-b-2 border-accent text-accent" : "text-gray-400 hover:text-gray-600"}`}
                onClick={() => setActiveTab("catalog")}
              >
                Catalog Product
              </button>
              <button
                className={`pb-2 px-4 font-bold transition-colors ${activeTab === "custom" ? "border-b-2 border-accent text-accent" : "text-accent"}`}
                onClick={() => setActiveTab("custom")}
              >
                Custom Item
              </button>
            </div>

            {activeTab === "catalog" ? (
              <div className="space-y-6">
                {/* 1. Product Picker */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-primary">
                    Select Product
                  </label>
                  <div className="border rounded-xl p-4 bg-gray-50/50">
                    <ProductPicker
                      availableProducts={products}
                      selectedIds={selectedProduct ? [selectedProduct._id] : []}
                      onChange={handleProductSelect}
                      themeColor="#D4A373" // Accent color
                    />
                  </div>
                </div>

                {/* 2. Configuration (Polymorphic Forms) */}
                {selectedProduct && (
                   <div className="relative mt-4">
                      {isLoadingDetails && (
                        <div className="absolute inset-0 bg-white/80 z-20 flex items-center justify-center rounded-lg h-full">
                           <LoadingSpinner />
                        </div>
                      )}
                      
                      {selectedProduct.productType === 'set' ? (
                          <SetProductForm 
                             product={selectedProduct}
                             allFlavors={allFlavors} 
                             onAdd={(newItem) => {
                                 setItems([...items, newItem]);
                             }}
                             onCancel={() => setSelectedProduct(null)}
                          />
                      ) : (
                          <StandardProductForm 
                             product={selectedProduct}
                             allFlavors={allFlavors}
                             allDiameters={allDiameters}
                             onAdd={(newItem) => {
                                 setItems([...items, newItem]);
                             }}
                             onCancel={() => setSelectedProduct(null)}
                          />
                      )}
                   </div>
                )}
              </div>
            ) : (
              <CustomOrderItemForm
                  flavors={allFlavors}
                  diameters={allDiameters}
                  onSubmit={(newItem: OrderItem) => {
                    setItems([...items, newItem]);
                    showAlert("Custom item added!", "success");
                  }}
                  onCancel={() => setActiveTab("catalog")}
                />
            )}
          </div>

          {/* CART SUMMARY */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-border">
            <h3 className="font-bold text-lg mb-4">Order Summary</h3>
            {items.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
                <p className="text-gray-400">Cart is empty.</p>
                <p className="text-sm text-gray-400">
                  Add catalog or custom items to start.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-start p-4 bg-gray-50 rounded-lg border hover:border-accent/30 transition-colors"
                  >
                    <div className="flex gap-4">
                      {/* Image Logic */}
                      <div className="relative w-16 h-16 rounded-md overflow-hidden bg-gray-200 shrink-0">
                        <Image
                          src={item.imageUrl || "/placeholder.png"}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-bold text-primary text-lg">
                          {item.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {item.isCustom
                            ? "Custom Item"
                            : `${item.flavor} · ${allDiameters.find((d) => d._id === item.diameterId)?.name || "Size N/A"}`}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-white border px-2 py-0.5 rounded-full">
                            Qty: {item.quantity}
                          </span>
                          <span className="text-xs text-gray-500">
                            x ${item.price.toFixed(2)}/ea
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="font-bold text-lg text-primary">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                      <button
                        onClick={() => removeItem(idx)}
                        className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {items.length > 0 && (
              <div className="mt-8 pt-6 border-t">
                <div className="flex justify-between items-center text-2xl font-bold text-primary mb-6">
                  <span>Grand Total</span>
                  <span>${calculateGrandTotal().toFixed(2)}</span>
                </div>
                <Button
                  onClick={handleSubmit}
                  className="w-full py-6 text-lg shadow-lg hover:shadow-xl transition-all"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Creating Order...
                    </div>
                  ) : (
                    "Create Order"
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
