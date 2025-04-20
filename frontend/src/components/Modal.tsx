import React, { ReactNode } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    // Backdrop
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-darker bg-opacity-75 transition-opacity duration-300 ease-in-out" 
      onClick={onClose} // Close when clicking backdrop
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Modal Panel */}
      <div 
        className="relative w-full max-w-lg p-6 bg-white dark:bg-neutral-dark rounded-lg shadow-xl transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modal-appear"
        onClick={e => e.stopPropagation()} // Prevent closing when clicking inside modal panel
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between mb-4 pb-4 border-b border-neutral-light dark:border-neutral-dark">
          <h2 id="modal-title" className="text-xl font-semibold text-neutral-darker dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-neutral hover:text-neutral-darker hover:bg-neutral-lighter dark:text-neutral-light dark:hover:text-white dark:hover:bg-neutral-darker focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Close modal"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div>
          {children}
        </div>
      </div>
    </div>
  );
};

// Add animation keyframes in tailwind.config.js or a CSS file if needed:
/* 
@keyframes modal-appear {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
.animate-modal-appear {
  animation: modal-appear 0.3s ease-out forwards;
}
*/

export default Modal; 