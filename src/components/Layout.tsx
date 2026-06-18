import { useState, ReactElement } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Car, Calendar, CreditCard, 
  Settings, FileText, Menu, X, LogOut, ChevronRight, Archive, UserCog, BookOpen
} from 'lucide-react';
import { useAuth } from '../store/authStore';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import Chatbot from './Chatbot';

export default function Layout(): ReactElement {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const links = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/customers', label: 'Customers', icon: Users },
    { to: '/vehicles', label: 'Fleet Management', icon: Car },
    { to: '/reservations', label: 'Reservations', icon: Calendar },
    { to: '/payments', label: 'Payment Record', icon: CreditCard },
    { to: '/reports', label: 'System Reports', icon: FileText },
    { to: '/charges', label: 'Rate Management', icon: Settings },
    { to: '/archive', label: 'Archive', icon: Archive },
    { to: '/knowledge-base', label: 'Knowledge Base', icon: BookOpen },
  ];

  if (user?.role === 'admin') {
    links.push({ to: '/users', label: 'System Users', icon: UserCog });
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#111827] text-white">
      <div className="h-20 flex items-center px-6 border-b border-gray-800 bg-[#0f172a]">
        <div className="mr-3">
          <img src="https://media.base44.com/images/public/6a2f5c9c909358353286925c/efc86a642_PhillyCarRentalLogo.png" alt="Logo" className="h-8 object-contain" />
        </div>
        <div>
          <h1 className="font-black text-lg tracking-tight text-white leading-none">Vehicle Rental Sys</h1>
        </div>
      </div>

      <nav className="flex-1 py-8 px-4 space-y-1.5 overflow-y-auto scrollbar-hide">
        <p className="px-3 text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Operations</p>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) =>
              clsx(
                'group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
                isActive 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )
            }
          >
            <div className="flex items-center">
              <link.icon className={clsx("w-5 h-5 mr-3 shrink-0 transition-transform group-hover:scale-110")} />
              {link.label}
            </div>
            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-40 transition-opacity" />
          </NavLink>
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-gray-800 bg-[#0f172a]/50">
        <div className="mb-4 flex items-center gap-3 px-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-black shadow-inner">
            {user?.name?.[0].toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{user?.name || 'Administrator'}</p>
            <p className="text-[10px] text-gray-500 truncate">{user?.email || 'admin@fleetpro.com'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl text-sm font-bold transition-all duration-300 group"
        >
          <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Log Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-900 font-sans overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 shrink-0 h-full">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed inset-0 w-full bg-[#111827] z-[70] shadow-2xl flex flex-col"
            >
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-xl bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors z-[80]"
              >
                <X className="w-6 h-6" />
              </button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        <header className="h-20 lg:h-24 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center px-4 lg:px-10 sticky top-0 z-50 shrink-0">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors mr-4"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="hidden lg:block">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">System Console</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Global Fleet Operations</p>
          </div>

          <div className="ml-auto flex items-center gap-3 lg:gap-6">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-black text-slate-900 tracking-tighter">FLEET STATUS</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">System Live</span>
              </div>
            </div>
            
            <div className="w-px h-8 bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-3 bg-slate-50 p-1.5 pr-4 rounded-2xl border border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-800 font-black text-sm">
                {user?.name?.[0].toUpperCase() || 'A'}
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-bold text-slate-900 leading-none">{user?.name || 'Admin'}</p>
                <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">Administrator</p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-[#f8fafc] p-4 lg:p-10 scroll-smooth">
          <div className="max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </div>
        <Chatbot />
      </div>
    </div>
  );
}
