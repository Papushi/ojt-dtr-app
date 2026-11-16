import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ShieldCheck, X } from 'lucide-react';

interface TermsModalProps {
  open: boolean;
  acceptedAt?: string;
  onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ open, acceptedAt, onClose }) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print"
          role="dialog"
          aria-modal="true"
          aria-labelledby="terms-modal-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3
                    id="terms-modal-title"
                    className="text-base font-bold text-slate-900 dark:text-slate-100"
                  >
                    Terms &amp; Conditions
                  </h3>
                  {acceptedAt && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Accepted on {new Date(acceptedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
                aria-label="Close terms"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-h-[60vh] overflow-y-auto pr-1 leading-relaxed">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100">
                  1. Purpose of Application
                </h4>
                <p className="mt-1">
                  OJT DTR Tracker is a productivity tool built to help On-the-Job Training (OJT)
                  students record daily attendance, compute net working hours after break
                  deductions, monitor progress toward institutional hour requirements, and format
                  reports for supervisor review.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100">
                  2. Gmail Sync, Offline Cache &amp; Backups
                </h4>
                <p className="mt-1">
                  All time entries, target hours, and trainee profile details are linked to your
                  authenticated Gmail account and stored privately in cloud Firestore, with local
                  browser caching for offline viewing. We still encourage exporting periodic JSON,
                  Excel, or PDF backups for your personal records.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100">
                  3. Accuracy &amp; Academic Integrity
                </h4>
                <p className="mt-1">
                  Students are solely responsible for ensuring that logged shifts, overtime notes,
                  holidays, and absences truthfully reflect actual rendered training hours. Printed
                  and exported PDF documents remain unofficial until signed by an authorized
                  supervisor.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100">
                  4. Privacy &amp; Gmail Authentication
                </h4>
                <p className="mt-1">
                  Google Sign-In is used exclusively to authenticate your Gmail account and retrieve
                  your display name, email, and profile picture for your private workspace and
                  report headers. Your DTR logs are never sold or shared with third parties.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
