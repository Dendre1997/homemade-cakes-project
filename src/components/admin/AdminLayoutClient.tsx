'use client'
import { useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import HeaderAdmin from '@/components/admin/HeaderAdmin'

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <>
      <HeaderAdmin onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />
      <div className="flex h-screen bg-gray-100">
        <AdminSidebar isOpen={isSidebarOpen} />
        <main
          className={`
      flex-1 p-8 overflow-y-auto transition-all duration-300
      ${isSidebarOpen ? "ml-64" : "ml-0"}   /* desktop shift */
      ${isSidebarOpen ? "hidden md:block" : "block"} /* mobile hide */
    `}
        >
          {children}
        </main>
      </div>
    </>
  );
}