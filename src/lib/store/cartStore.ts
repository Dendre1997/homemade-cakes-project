import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: string;
  productId: string;
  categoryId: string;
  name: string;
  flavor: string;
  diameterId: string;
  price: number;
  quantity: number;
  imageUrl: string;
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
}


export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isMiniCartOpen: false,
      lastItemAdded: null,

      addItem: (itemToAdd) => {
        const items = get().items;
        const existingItem = items.find((item) => item.id === itemToAdd.id);

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
          });
        } else {
          set({
            items: [...items, itemToAdd],
            isMiniCartOpen: true,
            lastItemAdded: itemToAdd,
          });
        }
      },

      removeItem: (itemId) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
        })),

      increaseQuantity: (itemId: string) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item
          ),
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
            .filter((item) => item.quantity > 0), // Remove item if quantity is 0
        }));
      },

      clearCart: () => set({ items: [], lastItemAdded: null }),
      openMiniCart: () => set({ isMiniCartOpen: true }),
      closeMiniCart: () => set({ isMiniCartOpen: false, lastItemAdded: null }),
    }),
    {
      name: "cart-storage",
      partialize: (state) => ({ items: state.items }),
    }
  )
);

