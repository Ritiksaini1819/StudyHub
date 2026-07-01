import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Home,
  BookMarked,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  X,
  User,
  Calendar,
  ClipboardList,
  Users,
  BookOpenCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
}

export function SimpleLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isTeacher = profile?.role === 'teacher';

  const navItems: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: <Home className="w-5 h-5" /> },
    { name: 'Subjects', href: '/subjects', icon: <BookMarked className="w-5 h-5" /> },
    ...(isTeacher ? [
      { name: 'Classes', href: '/teaching/classes', icon: <Users className="w-5 h-5" /> },
      { name: 'Roadmaps', href: '/teaching/roadmaps', icon: <Calendar className="w-5 h-5" /> },
      { name: 'Lectures', href: '/teaching/lectures', icon: <ClipboardList className="w-5 h-5" /> },
    ] : [
      { name: 'My Lectures', href: '/my-lectures', icon: <BookOpenCheck className="w-5 h-5" /> },
    ]),
    { name: 'Profile', href: '/profile', icon: <User className="w-5 h-5" /> },
    { name: 'Settings', href: '/settings', icon: <Settings className="w-5 h-5" /> },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleNavClick = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gray-900 border-b border-gray-800 h-16">
        <div className="flex items-center justify-between h-full px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <Menu className="w-6 h-6" />
          </button>
          <Link to="/dashboard" className="flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-emerald-500" />
            <span className="text-lg font-bold text-white">StudyHub</span>
          </Link>
          <div className="w-10" />
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/80"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full bg-gray-900 border-r border-gray-800 transition-all duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${sidebarCollapsed ? 'w-20' : 'w-64'}`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className={`flex items-center h-16 px-4 border-b border-gray-800 ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!sidebarCollapsed && (
              <Link to="/dashboard" className="flex items-center gap-2">
                <BookOpen className="w-7 h-7 text-emerald-500" />
                <span className="text-lg font-bold text-white">StudyHub</span>
              </Link>
            )}
            {sidebarCollapsed && (
              <Link to="/dashboard">
                <BookOpen className="w-7 h-7 text-emerald-500" />
              </Link>
            )}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href ||
                (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={handleNavClick}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-emerald-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  } ${sidebarCollapsed ? 'justify-center' : ''}`}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  {item.icon}
                  {!sidebarCollapsed && <span className="font-medium">{item.name}</span>}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-gray-800 p-3">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg bg-gray-800/50">
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-medium">
                  {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {profile?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {isTeacher ? 'Teacher' : 'Student'}
                  </p>
                </div>
              </div>
            )}
            <button
              onClick={handleSignOut}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors ${
                sidebarCollapsed ? 'justify-center' : ''
              }`}
              title={sidebarCollapsed ? 'Sign Out' : undefined}
            >
              <LogOut className="w-5 h-5" />
              {!sidebarCollapsed && <span className="font-medium">Sign Out</span>}
            </button>
          </div>

          {/* Collapse toggle (desktop only) */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex items-center justify-center py-3 border-t border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <ChevronLeft className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main
        className={`transition-all duration-300 pt-16 lg:pt-0 ${
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
