import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: string;
  productId: string;
  categoryId: string;
  name: string;
  flavor?: string;
  flavorId?: string;
  diameterId?: string;
  price: number;
  quantity: number;
  imageUrl: string;
  inscription?: string;
  originalPrice?: number;
  discountName?: string;
  selectedConfig?: {
    items?: { flavorId: string; count: number }[];
    cake?: {
      flavorId: string;
      diameterId: string;
      inscription?: string;
    };
  };
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  increaseQuantity: (itemId: string) => void;
  decreaseQuantity: (itemId: string) => void;
  isMiniCartOpen: boolean;
  lastItemAdded: CartItem | null;
  openMiniCart: () => void;
  closeMiniCart: () => void;
  discountTotal: number;
  discountCode: string | null;
  discountName: string | null;

  setDiscount: (
    amount: number,
    code: string | null,
    name: string | null
  ) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isMiniCartOpen: false,
      lastItemAdded: null,

      // Ініціалізація
      discountTotal: 0,
      discountCode: null,
      discountName: null,

      addItem: (itemToAdd) => {
        const items = get().items;
        const existingItem = items.find((item) => item.id === itemToAdd.id);

        const newState = {
          discountTotal: 0,
          discountCode: null,
          discountName: null,
        };

        if (existingItem) {
          const updatedItems = items.map((item) =>
            item.id === itemToAdd.id
              ? { ...item, quantity: item.quantity + itemToAdd.quantity }
              : item
          );
          set({
            items: updatedItems,
            isMiniCartOpen: true,
            lastItemAdded: itemToAdd,
            ...newState,
          });
        } else {
          set({
            items: [...items, itemToAdd],
            isMiniCartOpen: true,
            lastItemAdded: itemToAdd,
            ...newState,
          });
        }
      },

      removeItem: (itemId) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
          discountTotal: 0, 
          discountCode: null,
        })),

      increaseQuantity: (itemId: string) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item
          ),
          discountTotal: 0,
        }));
      },

      decreaseQuantity: (itemId: string) => {
        set((state) => ({
          items: state.items
            .map((item) =>
              item.id === itemId
                ? { ...item, quantity: item.quantity - 1 }
                : item
            )
            .filter((item) => item.quantity > 0),
          discountTotal: 0, // Скидаємо
        }));
      },

      clearCart: () =>
        set({
          items: [],
          lastItemAdded: null,
          discountTotal: 0,
          discountCode: null,
        }),
      openMiniCart: () => set({ isMiniCartOpen: true }),
      closeMiniCart: () => set({ isMiniCartOpen: false, lastItemAdded: null }),

      setDiscount: (amount, code, name) =>
        set({ discountTotal: amount, discountCode: code, discountName: name }),
    }),
    {
      name: "cart-storage",
      partialize: (state) => ({ items: state.items }), 
    }
  )
);
