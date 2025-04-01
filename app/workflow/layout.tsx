import React from 'react';
import { DashboardLayout as UILayout } from '@/components/ui/layout';

export default function WorkflowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <UILayout>{children}</UILayout>;
} 