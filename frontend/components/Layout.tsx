import Link from 'next/link';
import { useRouter } from 'next/router';
import { ReactNode } from 'react';
import { useAuth } from '../utils/authContext';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

/**
 * Layout component renders the persistent UI: topbar, sidebar and
 * main content area.  It also handles redirects to the login page
 * if the user is not authenticated.
 */
export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const router = useRouter();

  // If no user, redirect to login page
  if (!user) {
    if (typeof window !== 'undefined') {
      router.replace('/login');
    }
    return null;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
      {/* Top Bar */}
      <div className="topbar">
        <div style={{ flex: 1 }}>
          <Link href="/">
            <strong>Project Docs Hub</strong>
          </Link>
        </div>
        <div style={{ marginRight: '1rem' }}>Logged in as {user.username}</div>
        <button onClick={() => logout()} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
          Logout
        </button>
      </div>
      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Sidebar */}
        <div className="sidebar">
          <Sidebar />
        </div>
        {/* Content */}
        <div className="content">{children}</div>
      </div>
    </div>
  );
}