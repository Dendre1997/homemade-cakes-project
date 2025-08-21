import React from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { verifyAdmin } from "@/lib/auth/adminOnly";
import HeaderAdmin from '@/components/admin/HeaderAdmin'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
  }) {
  await verifyAdmin()
  return (
    <>
    <HeaderAdmin/>
    <div className='flex h-screen bg-gray-100'>
      <AdminSidebar />

      <main className='flex-1 p-8 overflow-y-auto'>
        {/*  */}
        {children}
      </main>
    </div>
    </>
  );
}
