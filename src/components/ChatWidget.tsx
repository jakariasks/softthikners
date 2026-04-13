import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, User, Circle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { db, collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from '../lib/firebase';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, profile } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      setMessages([]);
      setUnreadCount(0);
      return;
    }

    const q = query(collection(db, 'chats'), orderBy('timestamp', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse();
      setMessages(msgs);
      
      if (!isOpen && snapshot.docChanges().some(change => change.type === 'added')) {
        setUnreadCount(prev => prev + 1);
      }

      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chats');
    });
    return unsubscribe;
  }, [isOpen, user]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;

    try {
      await addDoc(collection(db, 'chats'), {
        senderId: user.uid,
        senderName: user.displayName || 'Anonymous',
        senderPhoto: user.photoURL,
        text: message,
        timestamp: serverTimestamp(),
      });
      setMessage('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'chats');
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-80 sm:w-96 h-[500px] glass rounded-2xl flex flex-col shadow-2xl overflow-hidden border-accent/20"
          >
            {/* Header */}
            <div className="p-4 bg-accent text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <User size={20} />
                  </div>
                  <Circle size={10} className="absolute bottom-0 right-0 fill-green-400 text-green-400" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Softthikners Support</h4>
                  <p className="text-[10px] opacity-80">We usually reply in minutes</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 bg-background/50 custom-scrollbar">
              {messages.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <p>👋 Hello! How can we help you today?</p>
                </div>
              )}
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={cn(
                      "flex gap-3 max-w-[85%]",
                      msg.senderId === user?.uid ? "ml-auto flex-row-reverse" : "mr-auto"
                    )}
                  >
                    <div className="shrink-0 mt-1">
                      <div className="w-8 h-8 rounded-full bg-accent/20 overflow-hidden border border-accent/10">
                        <img 
                          src={msg.senderPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderName}`} 
                          alt={msg.senderName} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                    <div className={cn(
                      "flex flex-col",
                      msg.senderId === user?.uid ? "items-end" : "items-start"
                    )}>
                      <div className={cn(
                        "px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                        msg.senderId === user?.uid 
                          ? "bg-accent text-white rounded-tr-none" 
                          : "bg-muted text-foreground rounded-tl-none border border-border/50"
                      )}>
                        {msg.text}
                      </div>
                      <span className="text-[9px] text-muted-foreground mt-1.5 font-medium opacity-70">
                        {msg.senderId === user?.uid ? 'You' : msg.senderName} • {msg.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-accent/10">
              {user ? (
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-muted border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-accent outline-none"
                  />
                  <button type="submit" className="bg-accent text-white p-2 rounded-xl hover:bg-accent-hover transition-colors">
                    <Send size={18} />
                  </button>
                </form>
              ) : (
                <div className="text-center p-2">
                  <p className="text-xs text-muted-foreground mb-2">Please login to chat with us</p>
                  <Link to="/login" className="text-xs font-bold text-accent hover:underline">Login Now</Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl transition-all hover:scale-110 neon-glow relative",
          isOpen ? "bg-destructive rotate-90" : "bg-accent"
        )}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
        {!isOpen && unreadCount > 0 && (
          <motion.span 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-6 h-6 bg-destructive rounded-full text-[10px] flex items-center justify-center font-bold border-2 border-background"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>
    </div>
  );
}
