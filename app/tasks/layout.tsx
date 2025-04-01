import { DashboardLayout } from '@/components/ui/layout';

export default function TasksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
} 