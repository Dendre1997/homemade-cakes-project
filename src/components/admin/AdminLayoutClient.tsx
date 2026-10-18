'use client'
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import AdminSidebar from '@/components/admin/AdminSidebar';
import HeaderAdmin from '@/components/admin/HeaderAdmin'

const CopilotPanel = dynamic(() => import('@/components/admin/Copilot/CopilotPanel'), {
  ssr: false,
});

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  // Mounted closed during idle time so the first open still gets the slide-in transition.
  const [shouldMountCopilot, setShouldMountCopilot] = useState(false);
  const sidebarToggleRef = useRef<HTMLButtonElement>(null);
  const copilotToggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const mount = () => setShouldMountCopilot(true);
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(mount, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(mount, 1500);
    return () => window.clearTimeout(id);
  }, []);

  const handleToggleCopilot = () => {
    setShouldMountCopilot(true);
    setIsCopilotOpen((open) => !open);
  };

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
            onToggleCopilot={handleToggleCopilot}
            isCopilotOpen={isCopilotOpen}
            copilotToggleRef={copilotToggleRef}
          />
          <main className="flex-grow p-4 md:p-8">{children}</main>
        </div>
      </div>

      {shouldMountCopilot && (
        <CopilotPanel
          isOpen={isCopilotOpen}
          onClose={() => setIsCopilotOpen(false)}
          copilotToggleRef={copilotToggleRef}
        />
      )}
    </>
  );
}
