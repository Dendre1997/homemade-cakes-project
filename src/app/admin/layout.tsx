
import React from 'react';
import { verifyAdmin } from "@/lib/auth/adminOnly";
import AdminLayoutClient from '@/components/admin/AdminLayoutClient'


export default async function AdminLayout({
  
  children,
}: {
  children: React.ReactNode;
  }) { 
  await verifyAdmin()
  return (
    <AdminLayoutClient>
        {children}
    </AdminLayoutClient>
  );
}
