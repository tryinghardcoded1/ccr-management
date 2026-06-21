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
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-[#1e3a8a] p-8 text-white text-center">
            <div className="inline-flex items-center justify-center mb-4">
              <img src="https://i.imgur.com/NMk2vsy.png" alt="Logo" className="h-16 object-contain" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Vehicle Rental Sys</h1>
            <p className="text-blue-100 mt-2 text-sm">Sign in to manage your rental operations</p>
          </div>

          <div className="p-8">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 overflow-hidden"
                >
                  <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-600 transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-600 transition-colors">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-xs text-gray-600 font-medium">
                    Remember me
                  </label>
                </div>
                <div className="text-xs">
                  <a href="#" className="font-semibold text-blue-600 hover:text-blue-500">
                    Forgot password?
                  </a>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all mt-6"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  isSignUp ? 'Create & Register Account' : 'Sign In'
                )}
              </button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError('');
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-500 transition-colors"
                >
                  {isSignUp ? 'Already have an operational account? Sign In' : "Don't have an account or can't log in? Register / Sign Up"}
                </button>
              </div>
             </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-gray-400 font-medium">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2.5 py-3 px-4 border border-gray-200 rounded-xl shadow-sm text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all animate-none"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                <g transform="matrix(1, 0, 0, 1, 0, 0)">
                  <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.6h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.4c0,-0.34 -0.03,-0.68 -0.09,-1H21.35z" fill="#4285F4" />
                  <path d="M12,20.5c2.3,0 4.23,-0.76 5.64,-2.1l-3.3,-2.6c-0.9,0.6 -2.07,0.97 -3.34,0.97 -2.26,0 -4.17,-1.53 -4.85,-3.6H2.74v2.7C4.14,18.72 7.8,20.5 12,20.5z" fill="#34A853" />
                  <path d="M7.15,13.17c-0.17,-0.5 -0.27,-1.05 -0.27,-1.62c0,-0.57 0.1,-1.11 0.27,-1.62V7.2H2.74C2.16,8.37 1.83,9.70 1.83,11.12c0,1.42 0.33,2.75 0.91,3.92V13.17z" fill="#FBBC05" />
                  <path d="M12,6.18c1.25,0 2.37,0.43 3.25,1.27l2.43,-2.43C16.22,3.58 14.3,3 12,3c-4.2,0 -7.86,1.78 -9.26,4.4V10.1h4.4c0.68,-2.07 2.6,-3.6 4.86,-3.6z" fill="#EA4335" />
                </g>
              </svg>
              Sign In with Google
            </button>


            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-center text-xs text-gray-500">
                Authorized access only. Use your official company credentials.
              </p>
            </div>
          </div>
        </div>
        
        <p className="text-center text-xs text-gray-400 mt-8">
          &copy; 2026 Vehicle Rental Sys. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}
