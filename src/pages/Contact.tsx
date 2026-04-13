import { useState } from 'react';
import type { FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Phone, MapPin, Send, Github, Linkedin, Twitter, CheckCircle2 } from 'lucide-react';
import emailjs from '@emailjs/browser';
import { db, collection, addDoc, serverTimestamp } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    
    try {
      // 1. Save to Firestore (Backup)
      const messageRef = await addDoc(collection(db, 'messages'), {
        ...formData,
        timestamp: serverTimestamp(),
        isRead: false
      });

      // 3. Create Notification for Admin
      await addDoc(collection(db, 'notifications'), {
        userId: 'sksjakaria@gmail.com', // Main admin email as placeholder or UID if known
        title: 'New Contact Message',
        message: `You received a new message from ${formData.name} regarding "${formData.subject}".`,
        type: 'info',
        link: '/dashboard',
        isRead: false,
        timestamp: serverTimestamp()
      });

      // 2. Send via EmailJS (Direct to Inbox)
      const serviceId = (import.meta as any).env.VITE_EMAILJS_SERVICE_ID;
      const templateId = (import.meta as any).env.VITE_EMAILJS_TEMPLATE_ID;
      const publicKey = (import.meta as any).env.VITE_EMAILJS_PUBLIC_KEY;

      if (serviceId && templateId && publicKey) {
        await emailjs.send(
          serviceId,
          templateId,
          {
            from_name: formData.name,
            from_email: formData.email,
            subject: formData.subject,
            message: formData.message,
            to_email: 'info.softthinkers@gmail.com',
          },
          publicKey
        );
      } else {
        console.warn('EmailJS credentials missing. Message saved to database only.');
      }

      setStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
      setTimeout(() => setStatus('idle'), 5000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'messages');
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <div className="pt-32 pb-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-display font-bold mb-6"
          >
            Get in <span className="gradient-text">Touch</span>
          </motion.h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Have a project in mind or want to collaborate? We'd love to hear from you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Contact Info */}
          <div className="lg:col-span-1 space-y-8">
            <div className="glass p-8 rounded-[32px] border-accent/10">
              <h3 className="text-xl font-bold mb-8">Contact Information</h3>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent shrink-0">
                    <Mail size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Email Us</p>
                    <p className="font-medium">info.softthinkers@gmail.com</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent shrink-0">
                    <Phone size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Call Us</p>
                    <p className="font-medium">+880 1306-060688</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent shrink-0">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Visit Us</p>
                    <p className="font-medium">CSE Department, Begum Rokeya University, Rangpur</p>
                  </div>
                </div>
              </div>

              <div className="mt-12 pt-12 border-t border-accent/10">
                <h4 className="font-bold mb-6">Follow Us</h4>
                <div className="flex gap-4">
                  <a href="#" className="w-10 h-10 glass rounded-xl flex items-center justify-center hover:text-accent transition-colors"><Github size={20} /></a>
                  <a href="#" className="w-10 h-10 glass rounded-xl flex items-center justify-center hover:text-accent transition-colors"><Linkedin size={20} /></a>
                  <a href="#" className="w-10 h-10 glass rounded-xl flex items-center justify-center hover:text-accent transition-colors"><Twitter size={20} /></a>
                </div>
              </div>
            </div>

            <div className="glass rounded-[32px] overflow-hidden h-64 border-accent/10">
              <iframe
                title="Google Map"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3593.5818465171!2d89.2589334753556!3d25.75132997735955!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39e32de6f3d95203%3A0x11064a0a7543790!2sBegum%20Rokeya%20University%2C%20Rangpur!5e0!3m2!1sen!2sbd!4v1712567890000!5m2!1sen!2sbd"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
              />
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="glass p-8 md:p-12 rounded-[40px] border-accent/10 relative overflow-hidden">
              <AnimatePresence mode="wait">
                {status === 'success' ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    className="flex flex-col items-center justify-center py-12 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
                      className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center text-accent mb-8"
                    >
                      <CheckCircle2 size={48} />
                    </motion.div>
                    <h3 className="text-3xl font-display font-bold mb-4">Message Sent!</h3>
                    <p className="text-muted-foreground text-lg max-w-md mx-auto mb-8">
                      Thank you for reaching out. We've received your message and will get back to you as soon as possible.
                    </p>
                    <button
                      onClick={() => setStatus('idle')}
                      className="px-8 py-3 glass text-accent border-accent/20 rounded-2xl font-bold hover:bg-accent hover:text-white transition-all"
                    >
                      Send Another Message
                    </button>
                    
                    <div className="mt-12 pt-8 border-t border-accent/10 w-full">
                      <p className="text-sm text-muted-foreground">
                        Need immediate assistance? Email us at{' '}
                        <a href="mailto:info.softthinkers@gmail.com" className="text-accent font-bold hover:underline">
                          info.softthinkers@gmail.com
                        </a>
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <h3 className="text-2xl font-display font-bold mb-8">Send us a Message</h3>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Your Name</label>
                          <input
                            required
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="John Doe"
                            className="w-full bg-muted/50 border border-border rounded-2xl px-6 py-4 focus:outline-none focus:border-accent transition-colors"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Email Address</label>
                          <input
                            required
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="john@example.com"
                            className="w-full bg-muted/50 border border-border rounded-2xl px-6 py-4 focus:outline-none focus:border-accent transition-colors"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Subject</label>
                        <input
                          required
                          type="text"
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          placeholder="Project Inquiry"
                          className="w-full bg-muted/50 border border-border rounded-2xl px-6 py-4 focus:outline-none focus:border-accent transition-colors"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Message</label>
                        <textarea
                          required
                          rows={6}
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          placeholder="Tell us about your project..."
                          className="w-full bg-muted/50 border border-border rounded-2xl px-6 py-4 focus:outline-none focus:border-accent transition-colors resize-none"
                        />
                      </div>

                      <button
                        disabled={status === 'sending'}
                        type="submit"
                        className="w-full py-4 bg-accent text-white rounded-2xl font-bold hover:bg-accent-hover transition-all neon-glow flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {status === 'sending' ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Sending...
                          </>
                        ) : status === 'error' ? (
                          'Error Sending Message'
                        ) : (
                          <>
                            Send Message <Send size={18} />
                          </>
                        )}
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
