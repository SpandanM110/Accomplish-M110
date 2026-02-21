import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useErrorToastStore } from '@/stores/errorToastStore';

export function ErrorToast() {
  const { message, dismiss } = useErrorToastStore();

  if (!message) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="fixed bottom-4 right-4 z-[49] max-w-md"
        data-testid="error-toast"
      >
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 shadow-lg backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <p className="flex-1 min-w-0 text-sm text-foreground">{message}</p>
            <button
              onClick={dismiss}
              className="flex-shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
