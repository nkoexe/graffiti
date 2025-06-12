'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Modal from '../Modal/Modal';
import styles from './AddContentModal.module.css';

// Fix Leaflet icon issue
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface AddContentModalProps {
  open: boolean;
  onClose: () => void;
  onGraffitiUpload?: (graffiti: any) => void;
  initialPosition?: [number, number];
}

function LocationMarker({ position, setPosition }: { position: [number, number]; setPosition: (pos: [number, number]) => void }) {
  useMapEvents({
    click: (e) => {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position ? <Marker position={position} icon={icon} /> : null;
}

const AddContentModal: React.FC<AddContentModalProps> = ({ open, onClose, onGraffitiUpload, initialPosition }) => {
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [position, setPosition] = useState<[number, number]>(initialPosition || [46.67, 11.16]); // Use initial position or default
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    if (open && textareaRef.current) {
      adjustTextareaHeight();
    }
  }, [description, open]);

  // Update position when initialPosition changes
  useEffect(() => {
    if (initialPosition) {
      setPosition(initialPosition);
    }
  }, [initialPosition]);
  // Get user's location
  useEffect(() => {
    // Only try to get location if modal is open and no initial position is provided
    if (!open || initialPosition) {
      return;
    }

    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      console.warn('Geolocation API not available - not in browser environment.');
      return;
    }

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser.');
      return;
    }

    // Request user's current location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLoc: [number, number] = [position.coords.latitude, position.coords.longitude];
        setUserLocation(userLoc);
        setPosition(userLoc);
      },
      (error) => {
        console.warn('Error getting user location:', error.message);
        // Don't show error to user as this is not critical for the functionality
        // The position will remain at the default value
      },
      {
        enableHighAccuracy: true,
        timeout: 10000, // 10 second timeout
        maximumAge: 300000 // 5 minutes cache
      }
    );
  }, [open, initialPosition]);

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
    adjustTextareaHeight();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('description', description);
      formData.append('author', author || 'Unknown');
      formData.append('latitude', position[0].toString());
      formData.append('longitude', position[1].toString());

      // Add images to FormData
      images.forEach((image, index) => {
        formData.append(`image${index}`, image);
      });

      const response = await fetch('/api/graffiti', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload graffiti');
      }

      const result = await response.json();

      // Reset form
      setDescription('');
      setAuthor('');
      setImages([]);
      setImagePreviewUrls([]);
      if (userLocation) {
        setPosition(userLocation);
      }

      // Trigger data refresh in parent component with new graffiti data
      if (onGraffitiUpload) {
        onGraffitiUpload(result.graffiti);
      }

      onClose();
    } catch (error) {
      console.error('Error uploading graffiti:', error);
      alert('Failed to upload graffiti. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setImages([...images, ...filesArray]);

      // Create preview URLs
      const newImagePreviews = filesArray.map(file => URL.createObjectURL(file));
      setImagePreviewUrls([...imagePreviewUrls, ...newImagePreviews]);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    const newImagePreviewUrls = [...imagePreviewUrls];

    // Revoke the object URL to avoid memory leaks
    URL.revokeObjectURL(newImagePreviewUrls[index]);

    newImages.splice(index, 1);
    newImagePreviewUrls.splice(index, 1);

    setImages(newImages);
    setImagePreviewUrls(newImagePreviewUrls);
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <Modal open={open} onClose={onClose} className={styles.addContentModal}>
      <div className={styles.modalContent}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <input
              type="text"
              id="author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Author: Unknown"
              className={styles.formInput}
            />
          </div>
          <div className={styles.formSeparator}></div>
          <div className={styles.formGroup}>
            <textarea
              id="description"
              value={description}
              onChange={handleDescriptionChange}
              required
              placeholder="Does it have a name? What is it? How to reach it? What's interesting about it?"
              rows={3}
              className={styles.formInput}
              ref={textareaRef}
              style={{ overflow: 'hidden', minHeight: '80px', resize: 'none' }}
            />
          </div>
          <div className={styles.formSeparator}></div>
          <div className={styles.formGroup}>
            <label>Location</label>
            <div className={styles.mapContainer}>
              {/* Using key={open} to force remount when modal opens */}
              <MapContainer
                attributionControl={false}
                center={position}
                zoom={17}
                maxZoom={21}
                style={{ height: "200px", width: "100%" }}
                key={open.toString()}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  maxZoom={21}
                />
                <LocationMarker position={position} setPosition={setPosition} />
              </MapContainer>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Images</label>
            <div className={styles.imageUpload}>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                className={styles.fileInput}
                ref={fileInputRef}
              />
              <button
                type="button"
                onClick={triggerFileInput}
                className={styles.uploadButton}
              >
                <span className={styles.plusIcon}>+</span>
              </button>
            </div>

            {imagePreviewUrls.length > 0 && (
              <div className={styles.imagePreviewContainer}>
                {imagePreviewUrls.map((url, index) => (
                  <div key={index} className={styles.imagePreview}>
                    <img src={url} alt={`Preview ${index + 1}`} />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className={styles.removeImageButton}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Uploading...' : 'Submit'}
          </button>
        </form>
      </div>
    </Modal>
  );
};

export default AddContentModal;