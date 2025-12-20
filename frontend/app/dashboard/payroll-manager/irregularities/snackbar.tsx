import React from 'react';

export interface SnackbarProps {
  message: string;
  open: boolean;
  onClose: () => void;
  duration?: number;
}

export const Snackbar: React.FC<SnackbarProps> = ({ message, open, onClose, duration = 3000 }) => {
  React.useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [open, duration, onClose]);

  if (!open) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-green-600 text-white px-6 py-3 rounded shadow-lg flex items-center gap-2 min-w-[200px]">
        <span>{message}</span>
        <button onClick={onClose} className="ml-4 text-white hover:text-gray-200">&times;</button>
      </div>
    </div>
  );
};
