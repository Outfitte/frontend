import { NavLink, Outlet, useLocation } from 'react-router'
import {
  CalendarIcon,
  HomeIcon,
  MapPinIcon,
  ShirtIcon,
  ShareIcon,
  Share2Icon,
  SettingsIcon,
  TagIcon,
  MoonIcon,
  SunIcon,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { Button } from '@/components/ui/button'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: HomeIcon },
  { to: '/items', label: 'Items', icon: TagIcon },
  { to: '/outfits', label: 'Outfits', icon: ShirtIcon },
  { to: '/calendar', label: 'Calendar', icon: CalendarIcon },
  { to: '/locations', label: 'Locations', icon: MapPinIcon },
  { to: '/shared', label: 'Shared with me', icon: ShareIcon },
  { to: '/shares', label: 'My shares', icon: Share2Icon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

function NavItem({
  to,
  label,
  icon: Icon,
}: {
  to: string
  label: string
  icon: React.ElementType
}) {
  const end = to === '/'
  const { pathname } = useLocation()
  const isActive = end
    ? pathname === to
    : pathname === to || pathname.startsWith(to + '/')

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
        <NavLink to={to} end={end}>
          <Icon />
          <span>{label}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function DarkModeToggle() {
  const { theme, setTheme } = useThemeStore()
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      (window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false))

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}

function UserMenu() {
  const { user, logout } = useAuthStore()
  const initials = user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="hover:bg-accent flex items-center gap-2 rounded-md p-1"
          aria-label="User menu"
        >
          <Avatar size="sm">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          {user?.email && (
            <span className="hidden max-w-[160px] truncate text-sm lg:inline">
              {user.email}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <NavLink to="/settings">Settings</NavLink>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={logout}>
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AppLayout() {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <span className="px-2 text-lg font-semibold group-data-[collapsible=icon]:hidden">
              Outfitte
            </span>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV_ITEMS.map((item) => (
                    <NavItem key={item.to} {...item} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <header className="flex h-14 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <div className="flex flex-1 items-center justify-between">
              <span className="font-semibold lg:hidden">Outfitte</span>
              <div className="ml-auto flex items-center gap-2">
                <DarkModeToggle />
                <UserMenu />
              </div>
            </div>
          </header>
          <main className="flex-1 p-4">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
