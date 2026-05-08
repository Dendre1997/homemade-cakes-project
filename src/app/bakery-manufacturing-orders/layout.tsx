
import React from 'react';
import { verifyAdmin } from "@/lib/auth/adminOnly";
import AdminLayoutClient from '@/components/admin/AdminLayoutClient'
import { headers } from 'next/headers';


export default async function AdminLayout({
  
  children,
}: {
  children: React.ReactNode;
  }) { 
  const headersList = await headers();
  const isLoginPage = headersList.get('x-is-login-page') === 'true';

  if (isLoginPage) {
    return <>{children}</>;
  }

  await verifyAdmin()
  return (
    <AdminLayoutClient>
        {children}
    </AdminLayoutClient>
  );
}
