import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger'
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md glass rounded-[32px] p-8 shadow-2xl border-accent/20"
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 glass rounded-full hover:bg-destructive hover:text-white transition-all"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${
                variant === 'danger' ? 'bg-red-500/10 text-red-500' :
                variant === 'warning' ? 'bg-amber-500/10 text-amber-500' :
                'bg-accent/10 text-accent'
              }`}>
                <AlertTriangle size={32} />
              </div>

              <h2 className="text-2xl font-display font-bold mb-2">{title}</h2>
              <p className="text-muted-foreground mb-8">{message}</p>

              <div className="flex gap-4 w-full">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 glass rounded-xl font-bold hover:bg-white/5 transition-all"
                >
                  {cancelText}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={`flex-1 py-3 text-white rounded-xl font-bold transition-all ${
                    variant === 'danger' ? 'bg-red-500 hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.3)]' :
                    variant === 'warning' ? 'bg-amber-500 hover:bg-amber-600 shadow-[0_0_20px_rgba(245,158,11,0.3)]' :
                    'bg-accent hover:bg-accent-hover neon-glow'
                  }`}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
