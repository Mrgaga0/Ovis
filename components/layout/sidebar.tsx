import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  LayoutDashboard,
  FileText,
  Workflow,
  Settings,
  Users,
  Image,
  Video,
  File,
  Plus,
  ChevronRight
} from "lucide-react"

const sidebarNavItems = [
  {
    title: "대시보드",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "프로젝트",
    href: "/projects",
    icon: FileText,
  },
  {
    title: "워크플로우",
    href: "/workflows",
    icon: Workflow,
  },
  {
    title: "팀",
    href: "/team",
    icon: Users,
  },
  {
    title: "미디어",
    href: "/media",
    icon: Image,
  },
  {
    title: "설정",
    href: "/settings",
    icon: Settings,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-screen w-64 flex-col border-r border-border bg-background">
      <div className="p-6">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-primary/10">
            <Plus className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">Ovis</h2>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {sidebarNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-2 ios-button-outline",
                    isActive && "bg-accent/50"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.title}
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </Button>
              </Link>
            )
          })}
        </div>
      </ScrollArea>
      <div className="p-4 border-t border-border">
        <Button variant="outline" className="w-full ios-button-outline gap-2">
          <Settings className="w-4 h-4" />
          계정 설정
          <ChevronRight className="w-4 h-4 ml-auto" />
        </Button>
      </div>
    </div>
  )
} 