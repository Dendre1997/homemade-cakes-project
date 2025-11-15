"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { ConfirmationModal } from '@/components/ui/ConfirmationModal'

interface ConfirmationOptions {
  title: string;
  body: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "primary" | "danger";
}

type ShowConfirmation = (options: ConfirmationOptions) => Promise<boolean>;

const ConfirmationContext = createContext<ShowConfirmation | undefined>(
  undefined
);

export const ConfirmationProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmationOptions | null>(null);
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(
    null
  );

  const showConfirmation = useCallback(
    (options: ConfirmationOptions): Promise<boolean> => {
      setOptions(options);
      setIsOpen(true);
      return new Promise<boolean>((resolve) => {
        setResolver(() => resolve);
      });
    },
    []
  );

  const handleConfirm = () => {
    if (resolver) {
      resolver(true);
    }
    setIsOpen(false);
  };

  const handleClose = () => {
    if (resolver) {
      resolver(false);
    }
    setIsOpen(false);
  };

  return (
    <ConfirmationContext.Provider value={showConfirmation}>
      {children}

      {options && (
        <ConfirmationModal
          isOpen={isOpen}
          onClose={handleClose}
          onConfirm={handleConfirm}
          title={options.title}
          confirmText={options.confirmText}
          cancelText={options.cancelText}
          variant={options.variant}
        >
          {options.body}
        </ConfirmationModal>
      )}
    </ConfirmationContext.Provider>
  );
};

export const useConfirmation = () => {
  const context = useContext(ConfirmationContext);
  if (context === undefined) {
    throw new Error(
      "useConfirmation must be used within a ConfirmationProvider"
    );
  }
  return context;
};


// Example how to use
// import { useConfirmation } from "@/contexts/ConfirmationContext";
// const showConfirmation = useConfirmation();
// const confirmed = await showConfirmation({
//         title: "Capacity Warning",
//         body: `This order (${orderTotalMinutes} min) exceeds capacity (${initialAvailable} min) for ${dateStr}. Assign anyway?`,
//         confirmText: "Assign Anyway",
//         variant: "danger",
//       });

//       if (!confirmed) {
//         return; // if user clicked "Cancel"
//       }
//       // If 'confirmed' === true, continue
//     }