'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: '대시보드' },
  { href: '/generate', label: '블로그 생성' },
  { href: '/posts', label: '생성된 글' },
  { href: '/source-data', label: '소스 데이터' },
  { href: '/settings', label: '설정' },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-2">
          <Link href="/" className="text-xl font-bold text-gray-900">
            AI 블로그 생성 시스템
          </Link>
        </div>

        <nav className="flex items-center space-x-1 flex-1 justify-center">
          {navItems.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="w-24"></div>
      </div>
    </header>
  );
}
