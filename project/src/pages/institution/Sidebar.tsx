import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Briefcase } from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const links = [
    { path: '/institution/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/institution/students', icon: Users, label: 'Students' },
    { path: '/institution/jobs', icon: Briefcase, label: 'Jobs' },
  ];

  return (
    <div className="w-64 bg-white shadow-lg">
      <div className="h-full flex flex-col">
        <nav className="mt-8 flex-1">
          <div className="px-4 space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive(link.path)
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon
                    className={`mr-3 h-5 w-5 ${
                      isActive(link.path)
                        ? 'text-indigo-700'
                        : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

export default Sidebar;