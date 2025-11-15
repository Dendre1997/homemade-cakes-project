"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

type AlertType = "success" | "error" | "warning" | "info";

interface AlertState {
  isOpen: boolean;
  message: string | null;
  type: AlertType;
}

interface AlertContextType {
  alertState: AlertState;
  showAlert: (message: string, type: AlertType) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [alertState, setAlertState] = useState<AlertState>({
    isOpen: false,
    message: null,
    type: "info",
  });

  const showAlert = (message: string, type: AlertType) => {
    setAlertState({ isOpen: true, message, type });
  };

  const hideAlert = () => {
    setAlertState({ isOpen: false, message: null, type: "info" });
  };

  return (
    <AlertContext.Provider value={{ alertState, showAlert, hideAlert }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
};
