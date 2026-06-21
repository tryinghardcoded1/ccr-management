import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/authStore';
import { KeyRound, Mail, AlertCircle, Car, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { login, register, signInWithGoogle, isAuthenticated, isInitialized } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  React.useEffect(() => {
    if (isInitialized && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isInitialized, isAuthenticated, navigate, from]);

  const handleAuthCall = async (emailVal: string, passwordVal: string, explicitIsSignUp: boolean) => {
    setError('');
    setIsLoading(true);

    if (passwordVal && passwordVal.length < 6) {
      setError('Password must be at least 6 characters long.');
      setIsLoading(false);
      return;
    }

    try {
      const success = explicitIsSignUp 
        ? await register(emailVal, passwordVal)
        : await login(emailVal, passwordVal);

      if (success) {
        // Do not navigate immediately to avoid race condition with onAuthStateChanged.
        // The useEffect will navigate once isAuthenticated becomes true.
      } else {
        setError(explicitIsSignUp ? 'Registration failed. Please try again.' : 'Invalid email or password. Please try again.');
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error(err);
      let errMsg = 'An error occurred. Please try again.';
      if (err.code === 'auth/weak-password') {
        errMsg = 'Password must be at least 6 characters long.';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = 'Please enter a valid email address.';
      } else if (err.code === 'auth/email-already-in-use') {
        errMsg = 'This email is already in use. Please sign in instead or use a different email.';
      } else if (err.code === 'auth/wrong-password') {
        errMsg = err.message || 'Incorrect password. If you want to create a new user, please use a different email.';
      } else if (err.message) {
        errMsg = err.message;
      }
      setError(errMsg);
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleAuthCall(email, password, isSignUp);
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);

    try {
      const success = await signInWithGoogle();
      if (success) {
        // Validation handles the redirect
      } else {
        setError('Google Sign-In was cancelled or failed. Please try again.');
        setIsLoading(false);
      }
    } catch (err) {
      setError('An error occurred during Google Sign-In. Please try again.');
      setIsLoading(false);
    }
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
              <img src="https://i.imgur.com/NMk2vsy.png" alt="Company Logo" className="h-20 sm:h-24 max-w-[280px] mx-auto object-contain transition-transform duration-500 hover:scale-105" />
            </div>

            <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2 text-center">
               {isSignUp ? 'Create an Account' : 'System Login'}
            </h1>
            <p className="text-slate-500 text-sm font-medium text-center mb-8">
               {isSignUp ? 'Register to configure your workspace.' : 'Enter your credentials to continue.'}
            </p>

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
                  isSignUp ? 'Create & Register Account' : 'Sign In to Dashboard'
                )}
              </button>

              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError('');
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
                >
                  {isSignUp ? 'Already have an operational account? Sign In' : "Need an account? Register"}
                </button>
              </div>
             </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-[10px] font-black tracking-widest uppercase">
                <span className="bg-white px-4 text-slate-400">Or Access With</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-3 py-3.5 px-4 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-200 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                <g transform="matrix(1, 0, 0, 1, 0, 0)">
                  <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.6h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.4c0,-0.34 -0.03,-0.68 -0.09,-1H21.35z" fill="#4285F4" />
                  <path d="M12,20.5c2.3,0 4.23,-0.76 5.64,-2.1l-3.3,-2.6c-0.9,0.6 -2.07,0.97 -3.34,0.97 -2.26,0 -4.17,-1.53 -4.85,-3.6H2.74v2.7C4.14,18.72 7.8,20.5 12,20.5z" fill="#34A853" />
                  <path d="M7.15,13.17c-0.17,-0.5 -0.27,-1.05 -0.27,-1.62c0,-0.57 0.1,-1.11 0.27,-1.62V7.2H2.74C2.16,8.37 1.83,9.70 1.83,11.12c0,1.42 0.33,2.75 0.91,3.92V13.17z" fill="#FBBC05" />
                  <path d="M12,6.18c1.25,0 2.37,0.43 3.25,1.27l2.43,-2.43C16.22,3.58 14.3,3 12,3c-4.2,0 -7.86,1.78 -9.26,4.4V10.1h4.4c0.68,-2.07 2.6,-3.6 4.86,-3.6z" fill="#EA4335" />
                </g>
              </svg>
              Google Workspace Log In
            </button>
        </div>
      </motion.div>
    </div>
  );
}
