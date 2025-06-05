'use client';

import dynamic from "next/dynamic";
import { useMemo, useState, useEffect } from "react";
import 'reactjs-popup/dist/index.css';
import { FaTrash } from "react-icons/fa";

import Modal from "./components/Modal/Modal";
import styles from "./page.module.css";
import modalStyles from "./components/Modal/Modal.module.css";
import { useGraffiti } from "./contexts/GraffitiContext";

interface GraffitiData {
  id: number;
  posix: [number, number];
  description: string;
  images: string[];
  uploadDate: string;
  author: string;
}

export default function Home() {
  const { graffitiData, refreshData, removeGraffiti, addGraffiti } = useGraffiti();
  const [openModal, setOpenModal] = useState(false);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [selectedElement, setSelectedElement] = useState<GraffitiData | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([46.6707291, 11.1591838]);
  const [locationStatus, setLocationStatus] = useState<'requesting' | 'granted' | 'denied' | 'unavailable' | 'timeout'>('requesting');
  const [longPressCoordinates, setLongPressCoordinates] = useState<[number, number] | null>(null);

  // Get user's current location
  const getUserLocation = () => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      console.log('Geolocation is not supported by this browser');
      setLocationStatus('unavailable');
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000, // 10 second timeout
      maximumAge: 300000 // 5 minutes cache
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log('User location obtained:', latitude, longitude);
        setMapCenter([latitude, longitude]);
        setLocationStatus('granted');
      },
      (error) => {
        console.log('Error getting user location:', error.message);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationStatus('denied');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationStatus('unavailable');
            break;
          case error.TIMEOUT:
            setLocationStatus('timeout');
            break;
          default:
            setLocationStatus('unavailable');
            break;
        }
      },
      options
    );
  };

  useEffect(() => {
    getUserLocation();
  }, []);

  const Map = useMemo(() => dynamic(
    () => import('./components/Map/Map'),
    {
      loading: () => (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          width: '100%',
          fontSize: '1.2rem',
          color: '#666',
          fontWeight: 500,
        }}>
          <p>Keep looking for street art...</p>
        </div>
      ),
      ssr: false
    }
  ), []);

  const AddContentModal = useMemo(() => dynamic(
    () => import('./components/AddContentModal/AddContentModal'),
    {
      loading: () => null,
      ssr: false
    }
  ), []);

  // Handle marker click
  const handleMarkerClick = (element: GraffitiData) => {
    setSelectedElement(element);
    setOpenModal(true);
  };
  // Handle add button click
  const handleAddButtonClick = () => {
    setLongPressCoordinates(null); // Reset coordinates when using button
    setOpenAddModal(true);
  };

  // Handle long press on map
  const handleMapLongPress = (coordinates: [number, number]) => {
    setLongPressCoordinates(coordinates);
    setOpenAddModal(true);
  };

  // Handle successful graffiti upload
  const handleGraffitiUpload = (newGraffiti: GraffitiData) => {
    addGraffiti(newGraffiti); // Add to local state immediately
  };

  // Handle modal close
  const handleAddModalClose = () => {
    setOpenAddModal(false);
    setLongPressCoordinates(null); // Reset coordinates when closing modal
  };

  const handleDeleteGraffiti = async (id: number) => {
    if (!selectedElement) return;

    try {
      const response = await fetch(`/api/graffiti/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete graffiti');
      }

      setOpenModal(false);
      setSelectedElement(null);
      removeGraffiti(id); // Update local state immediately
    } catch (error) {
      console.error('Error deleting graffiti:', error);
      alert('Failed to delete graffiti. Please try again.');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.map}>
        <Map
          data={graffitiData}
          onMarkerClick={handleMarkerClick}
          onAddClick={handleAddButtonClick}
          onRightClick={handleMapLongPress}
          center={mapCenter}
        />
      </div>{selectedElement && (
        <Modal open={openModal} onClose={() => setOpenModal(false)}>
          <div>
            <div style={{ marginBottom: "10px", fontSize: "0.9rem", color: "#666" }}>
              <p style={{ margin: "2px 0" }}>
                First discovered: {new Date(selectedElement.uploadDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <h3 className={modalStyles.title}>Graffiti by: {selectedElement.author}</h3>
            <div
              style={{
                display: "flex",
                overflowX: "auto",
                gap: "10px",
                padding: "5px 0",
                marginBottom: "15px",
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "none",
              }}
            >
              {selectedElement.images.map((image, index) => (
                <div
                  key={index}
                  style={{
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={image}
                    alt={`Graffiti image ${index + 1} by ${selectedElement.author}`}
                    style={{
                      height: "200px",
                      width: "auto",
                      objectFit: "cover",
                      borderRadius: "8px",
                    }}
                  />
                </div>
              ))}
            </div>
            <p className={modalStyles.description}>{selectedElement.description}</p>
            <div className={styles.controlBar}>
              <button
                onClick={() => handleDeleteGraffiti(selectedElement.id)}
                className={`${styles.controlButton} ${styles.deleteButton}`}
              >
                <FaTrash />
              </button>
            </div>
          </div>
        </Modal>
      )}
      <AddContentModal
        open={openAddModal}
        onClose={handleAddModalClose}
        onGraffitiUpload={handleGraffitiUpload}
        initialPosition={longPressCoordinates || undefined}
      />
    </div>
  );
}
