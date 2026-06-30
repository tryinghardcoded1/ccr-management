import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/authStore';
import { KeyRound, Mail, AlertCircle, Car, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Login() {
  const [email, setEmail] = useState('staffuser1@gmail.com');
  const [password, setPassword] = useState('StaffUser1');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated, isInitialized } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  React.useEffect(() => {
    if (isInitialized && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isInitialized, isAuthenticated, navigate, from]);

  const handleAuthCall = async (emailVal: string, passwordVal: string) => {
    setError('');
    setIsLoading(true);

    try {
      const success = await login(emailVal, passwordVal);

      if (success) {
        // Do not navigate immediately to avoid race condition with onAuthStateChanged.
        // The useEffect will navigate once isAuthenticated becomes true.
      } else {
        setError('Invalid email or password. Please try again.');
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error(err);
      let errMsg = 'An error occurred. Please try again.';
      if (err.code === 'auth/invalid-email') {
        errMsg = 'Please enter a valid email address.';
      } else if (err.code === 'auth/wrong-password') {
        errMsg = 'Incorrect password.';
      } else if (err.message) {
        errMsg = err.message;
      }
      setError(errMsg);
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleAuthCall(email, password);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
         <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-600/10 rounded-full mix-blend-screen filter blur-[120px] animate-pulse"></div>
         <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-rose-600/10 rounded-full mix-blend-screen filter blur-[120px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[1000px] flex rounded-[2rem] shadow-2xl overflow-hidden bg-white relative z-10 border border-slate-200"
      >
        {/* Left Visual Panel */}
        <div className="hidden lg:flex flex-col flex-1 relative bg-slate-900 border-r border-slate-100/10">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-30 mix-blend-luminosity"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent"></div>
          
          <div className="relative z-10 flex flex-col h-full justify-end p-12 text-white">
            <h2 className="text-3xl font-black mb-4 tracking-tight text-white leading-tight">Elevate Your Fleet<br/>Management</h2>
            <p className="text-slate-400 font-medium text-sm leading-relaxed">
              Securely access your operational dashboard to manage reservations, track vehicles, and automate your workflow with precision.
            </p>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="flex-1 p-8 sm:p-12 lg:p-16 flex flex-col justify-center bg-white relative">
            <div className="mb-10 text-center">
              <img src="https://imgur.com/NMk2vsy.png" alt="Company Logo" className="h-20 sm:h-24 max-w-[280px] mx-auto object-contain transition-transform duration-500 hover:scale-105" />
            </div>

            <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2 text-center">
               System Login
            </h1>
            <p className="text-slate-500 text-sm font-medium text-center mb-8">
               Enter your credentials to continue.
            </p>
            
            <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-center text-xs">
              <p className="font-bold text-indigo-900">Demo Account</p>
              <p className="text-indigo-700">Email: staffuser1@gmail.com</p>
              <p className="text-indigo-700">Password: StaffUser1</p>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 overflow-hidden"
                >
                  <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100 font-medium">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
                    <span>{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                  />
                  <label htmlFor="remember-me" className="ml-2.5 block text-xs font-semibold text-slate-600 cursor-pointer select-none">
                    Remember me
                  </label>
                </div>
                <div className="text-xs">
                  <a href="#" className="font-bold text-indigo-600 hover:text-indigo-500 transition-colors">
                    Forgot password?
                  </a>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-xl shadow-sm text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all mt-6"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Sign In to Dashboard'
                )}
              </button>
             </form>

            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center">
              <button
                type="button"
                onClick={() => navigate('/portal')}
                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 mb-4 border border-indigo-100 rounded-xl text-sm font-bold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-200 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all tracking-tight"
              >
                Access Public Voice Portal
              </button>
              <p className="text-center text-xs text-slate-500 font-medium">
                Authorized backend access only. Use your official credentials.
              </p>
            </div>
        </div>
      </motion.div>
    </div>
  );
}
