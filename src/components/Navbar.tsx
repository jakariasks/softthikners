import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Moon, Sun, LogIn, LogOut, User, Cpu, Search } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { auth, signOut } from '../lib/firebase';
import { cn } from '../lib/utils';
import SearchModal from './SearchModal';

const navLinks = [
  { name: 'Home', path: '/' },
  { name: 'Services', path: '/services' },
  { name: 'Team', path: '/team' },
  { name: 'Works', path: '/works' },
  { name: 'Blog', path: '/blog' },
  { name: 'Gallery', path: '/gallery' },
  { name: 'Contact', path: '/contact' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const { user, profile } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <>
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 py-4",
        isOpen ? "bg-transparent" : (scrolled ? "glass py-3" : "bg-transparent")
      )}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-white neon-glow group-hover:scale-110 transition-transform">
              <Cpu size={24} strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold text-xl tracking-tight hidden sm:block text-foreground">
              Softthikners
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-accent relative",
                  location.pathname === link.path ? "text-accent" : "text-foreground/70"
                )}
              >
                {link.name}
                {location.pathname === link.path && (
                  <motion.div
                    layoutId="nav-underline"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-accent"
                  />
                )}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 rounded-full hover:bg-muted transition-colors text-foreground/60 hover:text-accent"
              aria-label="Search"
            >
              <Search size={20} />
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {user ? (
              <div className="flex items-center gap-3">
                <Link to="/dashboard" className="w-9 h-9 rounded-full overflow-hidden border-2 border-accent/30 hover:border-accent transition-colors">
                  <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </Link>
                <button onClick={() => signOut(auth)} className="hidden sm:flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-destructive transition-colors">
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            ) : (
              <Link to="/login" className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-full text-sm font-medium hover:bg-accent-hover transition-all neon-glow">
                <LogIn size={16} />
                Login
              </Link>
            )}

            <button
              onClick={() => setIsOpen(!isOpen)}
              className={cn(
                "md:hidden p-2 rounded-xl transition-all relative z-[60]",
                isOpen ? "bg-accent text-white shadow-lg scale-110" : "hover:bg-muted"
              )}
              aria-label={isOpen ? "Close menu" : "Open menu"}
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Overlay */}
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-md md:hidden"
              />
              
              {/* Drawer */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 right-0 w-[280px] z-50 md:hidden bg-background border-l border-border shadow-2xl flex flex-col p-6 pt-24"
              >
                <div className="flex flex-col gap-2">
                  {navLinks.map((link, i) => (
                    <motion.div
                      key={link.path}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Link
                        to={link.path}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          "text-xl font-display font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-between group",
                          location.pathname === link.path 
                            ? "bg-accent/10 text-accent" 
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {link.name}
                        {location.pathname === link.path && (
                          <div className="w-1.5 h-1.5 rounded-full bg-accent neon-glow" />
                        )}
                      </Link>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-auto space-y-6">
                  <div className="pt-6 border-t border-border">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4">Account</p>
                    {user ? (
                      <div className="flex items-center justify-between bg-muted/50 p-3 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <img 
                            src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                            className="w-8 h-8 rounded-full border border-accent/20" 
                            alt="Avatar"
                          />
                          <span className="text-sm font-bold truncate max-w-[100px]">{user.displayName || 'User'}</span>
                        </div>
                        <button
                          onClick={() => {
                            signOut(auth);
                            setIsOpen(false);
                          }}
                          className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          <LogOut size={18} />
                        </button>
                      </div>
                    ) : (
                      <Link
                        to="/login"
                        onClick={() => setIsOpen(false)}
                        className="w-full py-4 bg-accent text-white rounded-2xl font-bold flex items-center justify-center gap-2 neon-glow"
                      >
                        <LogIn size={18} />
                        Login to Portal
                      </Link>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                    <span>© 2026 Softthikners</span>
                    <div className="flex gap-3">
                      <span className="hover:text-accent cursor-pointer">TW</span>
                      <span className="hover:text-accent cursor-pointer">LI</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </nav>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
