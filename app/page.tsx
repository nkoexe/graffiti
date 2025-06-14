'use client';

import dynamic from "next/dynamic";
import { useMemo, useState, useEffect } from "react";
import 'reactjs-popup/dist/index.css';
import { FaTrash, FaChevronLeft, FaChevronRight } from "react-icons/fa";

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
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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
        const userPos: [number, number] = [latitude, longitude];
        setMapCenter(userPos);
        setUserPosition(userPos);
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

  // Watch user's position for real-time updates
  const watchUserPosition = () => {
    if (!navigator.geolocation) {
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000 // 1 minute cache for position updates
    };

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const userPos: [number, number] = [latitude, longitude];
        setUserPosition(userPos);
        console.log('User position updated:', latitude, longitude);
      },
      (error) => {
        console.log('Error watching user position:', error.message);
      },
      options
    );

    return watchId;
  };

  // Detect if we're on desktop
  useEffect(() => {
    const checkIfDesktop = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    checkIfDesktop();
    window.addEventListener('resize', checkIfDesktop);

    return () => {
      window.removeEventListener('resize', checkIfDesktop);
    };
  }, []);

  // Gallery state management
  useEffect(() => {
    const updateGalleryState = () => {
      const container = document.querySelector('.image-gallery-container') as HTMLElement;
      if (!container || !selectedElement || !openModal) {
        setCanScrollLeft(false);
        setCanScrollRight(false);
        return;
      }

      const scrollLeft = container.scrollLeft;
      const maxScroll = container.scrollWidth - container.clientWidth;

      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < maxScroll);
    };

    if (openModal && selectedElement) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      // Initial check after modal renders
      // allow some time for images to load
      // todo find a better way to handle this
      const timer = setTimeout(updateGalleryState, 1000);

      // Update on window resize
      window.addEventListener('resize', updateGalleryState);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', updateGalleryState);
      };
    }
  }, [openModal, selectedElement]);

  // Gallery navigation functions
  const scrollToImage = (direction: 'left' | 'right') => {
    const container = document.querySelector('.image-gallery-container') as HTMLElement;
    if (!container) return;

    const scrollAmount = direction === 'left' ? -250 : 250;

    container.scrollBy({
      left: scrollAmount,
      behavior: 'smooth'
    });
  };

  const handleGalleryScroll = () => {
    const container = document.querySelector('.image-gallery-container') as HTMLElement;
    if (!container) return;

    const scrollLeft = container.scrollLeft;
    const maxScroll = container.scrollWidth - container.clientWidth;

    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < maxScroll);
  };

  useEffect(() => {
    getUserLocation();

    // Start watching position after component mounts
    let watchId: number | undefined;

    const startWatching = () => {
      if (navigator.geolocation && locationStatus === 'granted') {
        watchId = watchUserPosition();
      }
    };

    // Add a small delay to ensure location permission is granted
    const timer = setTimeout(startWatching, 1000);

    // Cleanup function to clear the watch and timer
    return () => {
      clearTimeout(timer);
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []); // Only run once on mount

  // Separate effect to handle starting position watching when permission is granted
  useEffect(() => {
    let watchId: number | undefined;

    if (locationStatus === 'granted') {
      watchId = watchUserPosition();
    }

    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [locationStatus]);

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
          <p>Looking for street art...</p>
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
          userPosition={userPosition}
        />
      </div>

      {selectedElement && (
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

            <div style={{ position: 'relative' }}>
              <div
                className={`image-gallery-container ${styles.imageGalleryContainer}`}
                style={{
                  display: "flex",
                  overflowX: "auto",
                  gap: "10px",
                  margin: "5px 0",
                  marginBottom: "15px",
                  borderRadius: "20px",
                  WebkitOverflowScrolling: "touch",
                  scrollbarWidth: "none",
                  scrollBehavior: "smooth",
                }}
                onScroll={handleGalleryScroll}
              >
                {selectedElement.images.map((image, index) => (
                  <div
                    key={index}
                    style={{
                      height: "200px",
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

              {isDesktop && (
                <>
                  <button
                    onClick={() => scrollToImage('left')}
                    disabled={!canScrollLeft}
                    className={styles.galleryNavButton}
                    style={{
                      position: 'absolute',
                      left: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      opacity: canScrollLeft ? 1 : 0,
                      pointerEvents: canScrollLeft ? 'auto' : 'none'
                    }}
                    aria-label="Previous image"
                  >
                    <FaChevronLeft />
                  </button>

                  <button
                    onClick={() => scrollToImage('right')}
                    disabled={!canScrollRight}
                    className={styles.galleryNavButton}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      opacity: canScrollRight ? 1 : 0,
                      pointerEvents: canScrollRight ? 'auto' : 'none'
                    }}
                    aria-label="Next image"
                  >
                    <FaChevronRight />
                  </button>
                </>
              )}
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
