'use client';

import { useTheme } from '../../contexts/ThemeContext';
import { FaSun, FaMoon } from 'react-icons/fa';
import styles from './DarkModeToggle.module.css';

export default function DarkModeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={styles.toggleButton}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <div className={styles.iconContainer}>
        {theme === 'light' ? (
          <FaMoon className={styles.icon} />
        ) : (
          <FaSun className={styles.icon} />
        )}
      </div>
    </button>
  );
}
