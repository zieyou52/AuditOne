import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface MenuItem {
  to: string;
  label: string;
  show: (a: ReturnType<typeof useAuth>) => boolean;
}

const MENU: MenuItem[] = [
  { to: '/dashboard', label: '대시보드', show: () => true },
  { to: '/accounting', label: '회계 내역', show: (a) => a.has('account.read') },
  { to: '/budget', label: '예산', show: (a) => a.has('budget.read') },
  { to: '/audit', label: '감사', show: (a) => a.has('audit.use') },
  { to: '/permissions', label: '권한 관리', show: (a) => a.isSuperAdmin },
];

export default function AppLayout() {
  const auth = useAuth();
  const nav = useNavigate();
  const visible = MENU.filter((m) => m.show(auth));

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-neutral-200 bg-white px-3 py-5">
        <div className="px-3 pb-5">
          <div className="text-lg font-medium">AuditOne</div>
          <div className="mt-1 text-xs text-neutral-500">{auth.org?.name}</div>
        </div>
        <nav className="flex flex-col gap-1">
          {visible.map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm ${
                  isActive
                    ? 'bg-neutral-100 font-medium text-neutral-900'
                    : 'text-neutral-600 hover:bg-neutral-50'
                }`
              }
            >
              {m.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-6 border-t border-neutral-200 pt-4">
          <button
            onClick={() => nav('/orgs')}
            className="block w-full rounded-md px-3 py-2 text-left text-sm text-neutral-600 hover:bg-neutral-50"
          >
            단체 변경
          </button>
          <button
            onClick={async () => {
              await auth.signOut();
              nav('/login');
            }}
            className="block w-full rounded-md px-3 py-2 text-left text-sm text-neutral-600 hover:bg-neutral-50"
          >
            로그아웃
          </button>
        </div>
      </aside>
      <main className="flex-1 bg-paper px-8 py-7">
        <Outlet />
      </main>
    </div>
  );
}
