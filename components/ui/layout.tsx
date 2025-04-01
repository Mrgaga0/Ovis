'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  FileText, 
  Settings, 
  Users, 
  Bot, 
  Code, 
  Menu, 
  X,
  Workflow,
  LayoutGrid,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface SidebarNavProps {
  className?: string;
}

export function SidebarNav({ className }: SidebarNavProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const navItems = [
    {
      title: '대시보드',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: '에이전트',
      href: '/agents',
      icon: Bot,
    },
    {
      title: '태스크',
      href: '/tasks',
      icon: CheckCircle,
    },
    {
      title: '워크플로우',
      href: '/workflow',
      icon: Workflow,
    },
    {
      title: '프로젝트',
      href: '/projects',
      icon: FileText,
    },
    {
      title: '콘텐츠',
      href: '/content',
      icon: FileText,
    },
    {
      title: '워크스페이스',
      href: '/workspace',
      icon: LayoutGrid,
    },
    {
      title: '설계',
      href: '/design',
      icon: Code,
    },
  ];

  return (
    <>
      {/* 모바일 메뉴 토글 버튼 */}
      <div className="flex items-center border-b h-16 px-4 lg:hidden">
        <div className="flex-1">
          <Link href="/" className="flex items-center">
            <span className="font-bold text-xl">Ovis</span>
          </Link>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </Button>
      </div>

      {/* 사이드바 */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform bg-background transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
          className
        )}
      >
        <div className="flex h-full flex-col overflow-y-auto border-r pt-5">
          <div className="px-4 py-4 hidden lg:block">
            <Link href="/" className="flex items-center">
              <span className="font-bold text-2xl">Ovis</span>
            </Link>
          </div>
          <div className="flex flex-col p-4 pt-4">
            <nav className="grid gap-2 px-2 text-sm">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileMenu}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground',
                    pathname === item.href || pathname.startsWith(`${item.href}/`)
                      ? 'bg-muted font-medium text-foreground'
                      : ''
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              ))}
            </nav>
          </div>
          <div className="mt-auto p-4">
            <Button variant="outline" className="w-full" asChild>
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                <span>설정</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* 모바일 메뉴 오버레이 */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeMobileMenu}
        />
      )}
    </>
  );
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1">
        <SidebarNav className="hidden lg:block" />
        <div className="flex-1">
          <SidebarNav className="lg:hidden" />
          <main className="flex-1 lg:p-6 p-4">{children}</main>
        </div>
      </div>
    </div>
  );
} 