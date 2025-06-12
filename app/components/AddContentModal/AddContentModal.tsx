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

function LocationMarker({ position, setPosition }: {
  position: [number, number];
  setPosition: (pos: [number, number]) => void;
}) {
  useMapEvents({
    click: (e) => {
      const newPosition: [number, number] = [e.latlng.lat, e.latlng.lng];
      setPosition(newPosition);
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
  const [isSubmitting, setIsSubmitting] = useState(false); const [errors, setErrors] = useState<{
    description?: string;
    author?: string;
    images?: string;
  }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Validation constants
  const MAX_DESCRIPTION_LENGTH = 500;
  const MAX_AUTHOR_LENGTH = 100;
  const MAX_IMAGES = 10;
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  // Validation functions
  const validateDescription = (value: string): string | undefined => {
    if (!value.trim()) {
      return 'Description is required';
    }
    if (value.length > MAX_DESCRIPTION_LENGTH) {
      return `Description must be less than ${MAX_DESCRIPTION_LENGTH} characters`;
    }
    return undefined;
  };

  const validateAuthor = (value: string): string | undefined => {
    if (value.length > MAX_AUTHOR_LENGTH) {
      return `Author name must be less than ${MAX_AUTHOR_LENGTH} characters`;
    }
    return undefined;
  };
  const validateImages = (imageFiles: File[]): string | undefined => {
    if (imageFiles.length === 0) {
      return 'At least 1 image is required';
    }
    if (imageFiles.length > MAX_IMAGES) {
      return `Maximum ${MAX_IMAGES} images allowed`;
    }

    for (const file of imageFiles) {
      if (file.size > MAX_FILE_SIZE) {
        return `Each image must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
      }
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return 'Only JPEG, PNG, GIF, and WebP images are allowed';
      }
    }
    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    const descriptionError = validateDescription(description);
    if (descriptionError) newErrors.description = descriptionError;

    const authorError = validateAuthor(author);
    if (authorError) newErrors.author = authorError;

    const imagesError = validateImages(images);
    if (imagesError) newErrors.images = imagesError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Clear specific error when field is modified
  const clearError = (field: keyof typeof errors) => {
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

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

  // Clear errors when modal opens/closes
  useEffect(() => {
    if (open) {
      setErrors({});
    }
  }, [open]);
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
    const value = e.target.value;
    setDescription(value);
    adjustTextareaHeight();
    clearError('description');

    // Real-time validation for description length
    if (value.length > MAX_DESCRIPTION_LENGTH) {
      setErrors(prev => ({ ...prev, description: `Description must be less than ${MAX_DESCRIPTION_LENGTH} characters` }));
    }
  };

  const handleAuthorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAuthor(value);
    clearError('author');

    // Real-time validation for author length
    if (value.length > MAX_AUTHOR_LENGTH) {
      setErrors(prev => ({ ...prev, author: `Author name must be less than ${MAX_AUTHOR_LENGTH} characters` }));
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // Validate form
    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

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

      const result = await response.json();      // Reset form
      setDescription('');
      setAuthor('');
      setImages([]);
      setImagePreviewUrls([]);
      setErrors({});
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
      const newImages = [...images, ...filesArray];

      // Validate new image selection
      const imagesError = validateImages(newImages);
      if (imagesError) {
        setErrors(prev => ({ ...prev, images: imagesError }));
        return;
      }

      // Clear images error if validation passes
      clearError('images');

      setImages(newImages);

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

    // Clear images error when removing images
    clearError('images');
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <Modal open={open} onClose={onClose} className={styles.addContentModal}>
      <div className={styles.modalContent}>
        <form onSubmit={handleSubmit} className={styles.form}>          <div className={styles.formGroup}>
          <input
            type="text"
            id="author"
            value={author}
            onChange={handleAuthorChange}
            placeholder="Author: Unknown"
            className={`${styles.formInput} ${errors.author ? styles.inputError : ''}`}
          />
          {errors.author && <div className={styles.errorMessage}>{errors.author}</div>}
        </div>
          <div className={styles.formSeparator}></div>          <div className={styles.formGroup}>
            <textarea
              id="description"
              value={description}
              onChange={handleDescriptionChange}
              required
              placeholder="Does it have a name? What is it? How to reach it? What's interesting about it?"
              rows={3}
              className={`${styles.formInput} ${errors.description ? styles.inputError : ''}`}
              ref={textareaRef}
              style={{ overflow: 'hidden', minHeight: '80px', resize: 'none' }}
            />
            {errors.description && <div className={styles.errorMessage}>{errors.description}</div>}
            <div className={styles.characterCount}>
              {description.length}/{MAX_DESCRIPTION_LENGTH}
            </div>
          </div>
          <div className={styles.formSeparator}></div>          <div className={styles.formGroup}>
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
              </MapContainer>            </div>
          </div><div className={styles.formGroup}>
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
                disabled={images.length >= MAX_IMAGES}
              >
                <span className={styles.plusIcon}>+</span>
              </button>
            </div>
            {errors.images && <div className={styles.errorMessage}>{errors.images}</div>}
            <div className={styles.imageCount}>
              {images.length}/{MAX_IMAGES} images
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
              </div>)}
          </div>

          {(images.length === 0 || !description.trim()) && (
            <div className={styles.submitRequirements}>
              To submit a new graffiti, you still need:
              {!description.trim() && <div>• A description</div>}
              {images.length === 0 && <div>• At least 1 image</div>}
            </div>
          )}

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting || Object.keys(errors).length > 0 || !description.trim() || images.length === 0}
          >
            {isSubmitting ? 'Uploading your images! Please give me a sec...' : 'Submit it!'}
          </button>
        </form>
      </div>
    </Modal>
  );
};

export default AddContentModal;