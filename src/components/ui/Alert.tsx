"use client";

import React, { ReactNode } from 'react';

// Define the possible alert types
type AlertType = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps {
  type: AlertType;
  title?: string;
  children: ReactNode;
  onClose?: () => void;
}

const alertConfig = {
  info: {
    containerClasses: 'bg-blue-50 border-blue-300',
    iconClasses: 'text-blue-500',
    closeButtonClasses: 'hover:bg-blue-100 focus:ring-blue-400',
  },
  success: {
    containerClasses: 'bg-green-50 border-green-300',
    iconClasses: 'text-green-500',
    closeButtonClasses: 'hover:bg-green-100 focus:ring-green-400',
  },
  warning: {
    containerClasses: 'bg-yellow-50 border-yellow-300',
    iconClasses: 'text-yellow-500',
    closeButtonClasses: 'hover:bg-yellow-100 focus:ring-yellow-400',
  },
  error: {
    containerClasses: 'bg-red-50 border-red-300',
    iconClasses: 'text-red-500',
    closeButtonClasses: 'hover:bg-red-100 focus:ring-red-400',
  },
};


export const Alert: React.FC<AlertProps> = ({
  type,
  title,
  children,
  onClose,
}) => {
  const config = alertConfig[type];

  return (
    <div
      className={`flex p-4 mb-4 border rounded-lg ${config.containerClasses}`}
      role="alert"
    >
      <div className="ml-3 text-sm flex-1">
        {title && <h3 className="font-medium text-gray-800">{title}</h3>}
        <div className={title ? 'mt-1 text-gray-700' : 'text-gray-700'}>{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className={`ml-auto -mx-1.5 -my-1.5 p-1.5 rounded-lg inline-flex items-center justify-center h-8 w-8 text-gray-500 focus:ring-2 ${config.closeButtonClasses}`}
          aria-label="Close"
        >
          <span className="sr-only">Dismiss</span>
          <svg className="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
          </svg>
        </button>
      )}
    </div>
  );
};