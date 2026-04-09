import { Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DarkModeToggle({ dark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition active:scale-90 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      aria-label="Toggle dark mode"
    >
      <motion.div
        key={dark ? 'moon' : 'sun'}
        initial={{ rotate: -90, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        exit={{ rotate: 90, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </motion.div>
    </button>
  );
}
