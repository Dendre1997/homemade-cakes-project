"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from "react";

export type AlertType = "success" | "error" | "warning" | "info";

interface AlertState {
  isOpen: boolean;
  message: string | null;
  type: AlertType;
  /** Bumps on each showAlert so repeated text still triggers a live announcement. */
  announcementId: number;
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
    announcementId: 0,
  });

  const showAlert = useCallback((message: string, type: AlertType) => {
    setAlertState((prev) => ({
      isOpen: true,
      message,
      type,
      announcementId: prev.announcementId + 1,
    }));
  }, []);

  const hideAlert = useCallback(() => {
    setAlertState((prev) => ({
      isOpen: false,
      message: null,
      type: "info",
      announcementId: prev.announcementId,
    }));
  }, []);

  const contextValue = useMemo(() => ({
    alertState,
    showAlert,
    hideAlert
  }), [alertState, showAlert, hideAlert]);

  return (
    <AlertContext.Provider value={contextValue}>
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
