import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Github, Linkedin, Mail, MapPin, ArrowUp, Send, Cpu, CheckCircle2 } from 'lucide-react';
import { db, collection, addDoc, serverTimestamp } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      await addDoc(collection(db, 'newsletter'), {
        email,
        timestamp: serverTimestamp()
      });
      setStatus('success');
      setEmail('');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'newsletter');
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <footer className="bg-slate-950 text-slate-400 py-16 px-6 relative overflow-hidden">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 relative z-10">
        <div className="col-span-1 md:col-span-1">
          <Link to="/" className="flex items-center gap-2 mb-6 group">
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-white neon-glow">
              <Cpu size={24} strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-white">
              Softthikners
            </span>
          </Link>
          <p className="text-sm leading-relaxed mb-6">
            A university CSE student team dedicated to building real-world problem-solving products and services. We think, we build, we solve.
          </p>
          <div className="flex gap-4">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors"><Github size={20} /></a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors"><Linkedin size={20} /></a>
            <a href="mailto:info.softthinkers@gmail.com" className="hover:text-accent transition-colors"><Mail size={20} /></a>
          </div>
        </div>

        <div>
          <h4 className="text-white font-display font-bold mb-6">Quick Links</h4>
          <ul className="space-y-4 text-sm">
            <li><Link to="/services" className="hover:text-accent transition-colors">Our Services</Link></li>
            <li><Link to="/team" className="hover:text-accent transition-colors">Meet the Team</Link></li>
            <li><Link to="/works" className="hover:text-accent transition-colors">Our Works</Link></li>
            <li><Link to="/blog" className="hover:text-accent transition-colors">Blog</Link></li>
            <li><Link to="/gallery" className="hover:text-accent transition-colors">Gallery</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-display font-bold mb-6">Contact Info</h4>
          <ul className="space-y-4 text-sm">
            <li className="flex items-start gap-3">
              <MapPin size={18} className="text-accent shrink-0" />
              <span>CSE Department, Begum Rokeya University, Rangpur</span>
            </li>
            <li className="flex items-center gap-3">
              <Mail size={18} className="text-accent shrink-0" />
              <span>info.softthinkers@gmail.com</span>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-display font-bold mb-6">Newsletter</h4>
          <p className="text-sm mb-4">Stay updated with our latest projects and tech insights.</p>
          <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm w-full focus:outline-none focus:border-accent transition-colors"
            />
            <button 
              disabled={status === 'loading' || status === 'success'}
              className="bg-accent text-white p-2 rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {status === 'loading' ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : status === 'success' ? (
                <CheckCircle2 size={18} />
              ) : (
                <Send size={18} />
              )}
            </button>
          </form>
          {status === 'success' && (
            <p className="text-[10px] text-accent mt-2 font-bold uppercase tracking-widest">Subscribed successfully!</p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-slate-900 flex flex-col md:row items-center justify-between gap-6">
        <p className="text-xs">
          © {new Date().getFullYear()} Softthikners. All Rights Reserved.
        </p>
        <button
          onClick={scrollToTop}
          className="bg-slate-900 p-3 rounded-full hover:bg-accent hover:text-white transition-all group"
        >
          <ArrowUp size={20} className="group-hover:-translate-y-1 transition-transform" />
        </button>
      </div>

      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 blur-[100px] rounded-full -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/5 blur-[100px] rounded-full -ml-48 -mb-48" />
    </footer>
  );
}
