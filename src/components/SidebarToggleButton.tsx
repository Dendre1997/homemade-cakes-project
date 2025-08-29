"use client";

import { Menu } from "lucide-react";

interface SidebarToggleButtonProps {
  onClick: () => void;
}

export default function SidebarToggleButton({
  onClick,
}: SidebarToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-lg hover:bg-gray-100 focus:outline-none"
      aria-label="Toggle sidebar"
    >
      <Menu className="w-6 h-6" />
    </button>
  );
}
