'use client'
import { useRef, useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import HeaderAdmin from '@/components/admin/HeaderAdmin'
import CopilotPanel from '@/components/admin/Copilot/CopilotPanel';

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const sidebarToggleRef = useRef<HTMLButtonElement>(null);
  const copilotToggleRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <div className="flex min-h-screen bg-background">
        <AdminSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          sidebarToggleRef={sidebarToggleRef}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <HeaderAdmin
            title={""}
            isSidebarOpen={isSidebarOpen}
            sidebarToggleRef={sidebarToggleRef}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            onToggleCopilot={() => setIsCopilotOpen((open) => !open)}
            isCopilotOpen={isCopilotOpen}
            copilotToggleRef={copilotToggleRef}
          />
          <main className="flex-grow p-4 md:p-8">{children}</main>
        </div>
      </div>

      <CopilotPanel
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        copilotToggleRef={copilotToggleRef}
      />
    </>
  );
}
