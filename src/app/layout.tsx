import { useLiveQuery } from 'dexie-react-hooks'
import type { CSSProperties } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Avatar } from '../components/ui/Avatar'
import { SyncStatus } from '../components/shared/SyncStatus'
import { Fab, Icon, NavigationBar, NavigationTab } from '../components/m3'
import { listMembers } from '../lib/db/repositories/members'
import { useCurrentMemberId } from '../features/auth/useCurrentMember'

const navItems = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/students', label: 'Students', icon: 'group' },
  { to: '/ledger', label: 'Ledger', icon: 'account_balance' },
  { to: '/reports', label: 'Reports', icon: 'bar_chart' },
  { to: '/settings', label: 'Settings', icon: 'settings' }
]

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const members = useLiveQuery(() => listMembers(), [], [])
  const currentMemberId = useCurrentMemberId()
  const currentMember = members.find((member) => member.id === currentMemberId)

  const activeIndex = Math.max(
    0,
    navItems.findIndex((item) => {
      if (item.to === '/') return location.pathname === '/' || location.pathname.startsWith('/outings')
      return location.pathname.startsWith(item.to)
    })
  )

  return (
    <div className="min-h-dvh bg-surface">
      <header className="safe-top sticky top-0 z-30 border-b border-outline-variant/60 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-md items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary">
              S
            </span>
            <span>
              <span className="m3-title-large block leading-none">Salo</span>
              <span className="m3-label-small mt-1 block uppercase tracking-[0.16em] text-on-surface-variant">
                Meal ledger
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-2.5">
            <SyncStatus />
            {currentMember ? (
              <Link to="/settings" aria-label="Open settings">
                <Avatar name={currentMember.name} order={currentMember.order} size="sm" />
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pb-44 pt-4">
        <Outlet />
      </main>

      {location.pathname === '/' ? (
        <div className="fixed bottom-24 right-4 z-30">
          <Fab
            label="New outing"
            variant="primary"
            onClick={() => navigate('/outings/new')}
          >
            <span slot="icon">
              <Icon>add</Icon>
            </span>
          </Fab>
        </div>
      ) : null}

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30">
        <div className="mx-auto max-w-md">
          <NavigationBar activeIndex={activeIndex} aria-label="Main navigation">
            {navItems.map((item, index) => (
              <NavigationTab
                key={item.to}
                active={index === activeIndex}
                label={item.label}
                onClick={() => navigate(item.to)}
              >
                <span slot="inactive-icon">
                  <Icon>{item.icon}</Icon>
                </span>
                <span slot="active-icon">
                  <Icon style={{ fontVariationSettings: "'FILL' 1" } as CSSProperties}>
                    {item.icon}
                  </Icon>
                </span>
              </NavigationTab>
            ))}
          </NavigationBar>
        </div>
      </div>
    </div>
  )
}
