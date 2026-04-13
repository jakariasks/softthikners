import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, FolderKanban, FileText, ArrowRight, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { db, collection, getDocs, query, orderBy, limit } from '../lib/firebase';

interface SearchResult {
  id: string;
  title: string;
  type: 'project' | 'blog';
  category: string;
  link: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setSearchTerm('');
      setResults([]);
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.trim().length >= 2) {
        performSearch();
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const performSearch = async () => {
    setIsLoading(true);
    try {
      const projectsSnap = await getDocs(query(collection(db, 'projects'), limit(10)));
      const blogsSnap = await getDocs(query(collection(db, 'blogs'), limit(10)));

      const projectResults: SearchResult[] = projectsSnap.docs
        .map(doc => ({
          id: doc.id,
          title: doc.data().title,
          type: 'project' as const,
          category: doc.data().category,
          link: '/works'
        }))
        .filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));

      const blogResults: SearchResult[] = blogsSnap.docs
        .map(doc => ({
          id: doc.id,
          title: doc.data().title,
          type: 'blog' as const,
          category: doc.data().category,
          link: `/blog/${doc.id}`
        }))
        .filter(b => b.title.toLowerCase().includes(searchTerm.toLowerCase()));

      setResults([...projectResults, ...blogResults]);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResultClick = (link: string) => {
    navigate(link);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-2xl glass rounded-[32px] overflow-hidden shadow-2xl border-accent/20"
          >
            <div className="p-6 border-b border-accent/10 flex items-center gap-4">
              <Search className="text-accent shrink-0" size={24} />
              <input
                autoFocus
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search projects, blogs, insights..."
                className="w-full bg-transparent border-none focus:outline-none text-xl font-display font-medium text-white placeholder:text-white/30"
              />
              <button 
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4 custom-scrollbar">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="animate-spin mb-4 text-accent" size={32} />
                  <p className="text-sm font-medium">Searching Softthikners database...</p>
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-2 mb-4">Results ({results.length})</p>
                  {results.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleResultClick(result.link)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all group text-left border border-transparent hover:border-white/10"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 group-hover:bg-accent/20 group-hover:text-accent transition-colors">
                        {result.type === 'project' ? <FolderKanban size={20} /> : <FileText size={20} />}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-white/90 group-hover:text-accent transition-colors">{result.title}</p>
                        <p className="text-xs text-white/40 uppercase tracking-widest">{result.type} • {result.category}</p>
                      </div>
                      <ArrowRight size={16} className="text-white/40 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </button>
                  ))}
                </div>
              ) : searchTerm.trim().length >= 2 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-lg font-medium mb-2">No results found for "{searchTerm}"</p>
                  <p className="text-sm">Try searching for different keywords or categories.</p>
                </div>
              ) : (
                <div className="py-8 px-4">
                  <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-6">Quick Links</p>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { name: 'Our Services', path: '/services' },
                      { name: 'Latest Works', path: '/works' },
                      { name: 'Tech Blog', path: '/blog' },
                      { name: 'Meet Team', path: '/team' }
                    ].map((link) => (
                      <Link
                        key={link.path}
                        to={link.path}
                        onClick={onClose}
                        className="p-4 glass rounded-2xl hover:bg-accent/10 hover:border-accent/30 transition-all flex items-center justify-between group border border-white/5"
                      >
                        <span className="font-bold text-sm text-white/90">{link.name}</span>
                        <ArrowRight size={14} className="text-white/40 group-hover:text-accent transition-colors" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-white/5 border-t border-accent/10 flex items-center justify-between text-[10px] font-bold text-white/40 uppercase tracking-widest">
              <span>Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/10 text-white/80">ESC</kbd> to close</span>
              <div className="flex gap-4">
                <span className="flex items-center gap-1 text-white/60"><div className="w-1.5 h-1.5 rounded-full bg-accent" /> Projects</span>
                <span className="flex items-center gap-1 text-white/60"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Blogs</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
