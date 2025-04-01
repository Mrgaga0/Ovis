import React from 'react';
import { DashboardLayout } from '@/components/ui/layout';

export default function AgentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}