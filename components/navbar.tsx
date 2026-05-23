import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useState } from 'react';

export function Navbar() {
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/(auth)/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // TODO: Replace with actual user data from auth context
  const userName = 'John Doe';
  const userRole = 'Admin';
  const userAvatar = '/placeholder-avatar.jpg';

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-semibold text-indigo-600">
                EstateFlow CRM
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link
                  href="/(dashboard)/"
                  className={router.pathname.startsWith('/(dashboard)')
                    ? 'border-b-2 border-indigo-500 px-3 py-2 rounded-md text-sm font-medium text-indigo-600 hover:text-indigo-500'
                    : 'px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                >
                  Dashboard
                </Link>
                <Link
                  href="/(dashboard)/leads"
                  className={router.pathname.startsWith('/(dashboard)/leads')
                    ? 'border-b-2 border-indigo-500 px-3 py-2 rounded-md text-sm font-medium text-indigo-600 hover:text-indigo-500'
                    : 'px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                >
                  Leads
                </Link>
                <Link
                  href="/(dashboard)/properties"
                  className={router.pathname.startsWith('/(dashboard)/properties')
                    ? 'border-b-2 border-indigo-500 px-3 py-2 rounded-md text-sm font-medium text-indigo-600 hover:text-indigo-500'
                    : 'px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                >
                  Properties
                </Link>
                <Link
                  href="/(dashboard)/followups"
                  className={router.pathname.startsWith('/(dashboard)/followups')
                    ? 'border-b-2 border-indigo-500 px-3 py-2 rounded-md text-sm font-medium text-indigo-600 hover:text-indigo-500'
                    : 'px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                >
                  Follow-ups
                </Link>
                <Link
                  href="/(dashboard)/notifications"
                  className={router.pathname.startsWith('/(dashboard)/notifications')
                    ? 'border-b-2 border-indigo-500 px-3 py-2 rounded-md text-sm font-medium text-indigo-600 hover:text-indigo-500'
                    : 'px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                >
                  Notifications
                </Link>
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6">
              {/* User Menu Button */}
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex max-w-xs items-center gap-2 rounded-md bg-indigo-50 px-2.5 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <img
                  className="h-8 w-8 rounded-full"
                  src={userAvatar}
                  alt=""
                />
                <div className="flex flex-col">
                  <span className="truncate">{userName}</span>
                  <span className="truncate text-xs text-gray-500">{userRole}</span>
                </div>
                <svg className="-mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {/* User Menu Dropdown */}
              {userMenuOpen && (
                <div className="z-20 mt-2 w-56 bg-white border border-gray-200 rounded-md shadow-lg py-1">
                  <div className="px-4 py-2">
                    <p className="text-sm font-medium text-gray-700">{userName}</p>
                    <p className="text-sm text-gray-500 truncate">{userRole}</p>
                  </div>
                  <div className="divider mx-4 my-0"></div>
                  <a
                    href="/(dashboard)/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Profile
                  </a>
                  <a
                    href="/(dashboard)/settings"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Settings
                  </a>
                  <div className="divider mx-4 my-0"></div>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="-mr-2 flex md:hidden">
            {/* Mobile Menu Button */}
            <button type="button" className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500">
              <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}