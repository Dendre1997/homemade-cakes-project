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
      {/* <div className={`flex-shrink-0 ${config.iconClasses}`}>
        {config.icon || (
          // Fallback icon if needed
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
          </svg>
        )}
      </div> */}
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