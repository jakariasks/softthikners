import { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Mail, Lock, Eye, EyeOff, Chrome, Facebook } from 'lucide-react';
import { auth, googleProvider, facebookProvider, signInWithPopup } from '../lib/firebase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, facebookProvider);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 pt-20">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/10 blur-[150px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass p-8 md:p-12 rounded-[40px] border-accent/20 shadow-2xl">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center font-heading text-3xl text-white neon-glow mx-auto mb-6">
              S
            </div>
            <h1 className="text-3xl font-display font-bold mb-2">Welcome Back</h1>
            <p className="text-muted-foreground text-sm">Login to access the team dashboard</p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-4 rounded-xl mb-6">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-muted/50 border border-border rounded-2xl pl-12 pr-6 py-4 focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-muted/50 border border-border rounded-2xl pl-12 pr-12 py-4 focus:outline-none focus:border-accent transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-accent transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-border bg-muted text-accent focus:ring-accent" />
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Remember me</span>
              </label>
              <Link to="#" className="text-xs font-bold text-accent hover:underline">Forgot Password?</Link>
            </div>

            <button
              disabled={loading}
              className="w-full py-4 bg-accent text-white rounded-2xl font-bold hover:bg-accent-hover transition-all neon-glow flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <LogIn size={18} />
              {loading ? 'Logging in...' : 'Login'}
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="py-4 glass rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-white/10 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                <Chrome size={20} />
                <span className="hidden sm:inline">Google</span>
              </button>
              <button
                onClick={handleFacebookLogin}
                disabled={loading}
                className="py-4 glass rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-white/10 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                <Facebook size={20} />
                <span className="hidden sm:inline">Facebook</span>
              </button>
            </div>
          </div>

          <p className="text-center mt-10 text-sm text-muted-foreground">
            Don't have an account? <Link to="#" className="text-accent font-bold hover:underline">Join the team</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
