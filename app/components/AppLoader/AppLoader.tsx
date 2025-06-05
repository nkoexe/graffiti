'use client';

import { useGraffiti } from '../../contexts/GraffitiContext';
import styles from '../../page.module.css';

interface AppLoaderProps {
  children: React.ReactNode;
}

export default function AppLoader({ children }: AppLoaderProps) {
  const { loading, error } = useGraffiti();

  if (loading) {
    return (
      <div className={styles.page}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontSize: '1.2rem',
          fontWeight: 500,
          gap: '10px',
        }}>
          <div>Loading graffiti data...</div>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f0f0f0',
            borderTop: '4px solid #333',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}></div>
          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontSize: '1.2rem',
          fontWeight: 500,
          gap: '20px',
          textAlign: 'center',
          padding: '20px',
        }}>
          <div style={{ color: '#e74c3c' }}>
            Failed to load graffiti data
          </div>
          <div style={{ fontSize: '0.9rem', color: '#666' }}>
            {error}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              fontSize: '1rem',
              backgroundColor: '#333',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
