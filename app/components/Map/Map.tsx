'use client';

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { LatLngExpression, LatLngTuple, DivIcon, LeafletMouseEvent } from 'leaflet';
import styles from './Map.module.css';
import { useState, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { FaSearch, FaPlus } from 'react-icons/fa';
import DarkModeToggle from '../DarkModeToggle/DarkModeToggle';
import { useTheme } from '../../contexts/ThemeContext';

import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

interface MapProps {
  data: {
    id: number,
    posix: LatLngTuple,
    description: string,
    images: string[],
    author: string,
  }[],
  center?: LatLngExpression | LatLngTuple,
  zoom?: number,
  onMarkerClick?: (element: any) => void,
  onAddClick?: () => void;
  onRightClick?: (coordinates: [number, number]) => void;
  userPosition?: [number, number] | null;
}

const defaults = {
  center: [46.6707291, 11.1591838] as LatLngExpression,
  zoom: 15,
}

const MapCenterUpdater = ({ center }: { center: LatLngExpression | LatLngTuple }) => {
  const map = useMap();
  const prevCenterRef = useRef<LatLngExpression | LatLngTuple | undefined>(undefined);

  useEffect(() => {
    if (center && center !== prevCenterRef.current) {
      map.setView(center, map.getZoom());
      prevCenterRef.current = center;
    }
  }, [center, map]);

  return null;
};

const RightClickHandler = ({ onRightClick }: { onRightClick?: (coordinates: [number, number]) => void }) => {
  useMapEvents({
    contextmenu: (e) => {
      if (onRightClick) {
        onRightClick([e.latlng.lat, e.latlng.lng]);
      }
    },
  });

  return null;
};

const Map = (props: MapProps) => {
  const { zoom = defaults.zoom, center = defaults.center, data, onMarkerClick, onAddClick, onRightClick, userPosition } = props;
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { theme } = useTheme();
  const filteredData = data.filter(element => {
    const query = searchQuery.toLowerCase().trim();
    return (
      element.author.toLowerCase().includes(query) ||
      element.description.toLowerCase().includes(query)
    );
  });

  // Get suggestions (first 5 filtered results)
  const suggestions = searchQuery.trim() ? filteredData.slice(0, 5) : [];

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchQuery(value);
    setShowSuggestions(value.trim().length > 0);
  };

  const handleSuggestionClick = (element: any) => {
    if (onMarkerClick) {
      onMarkerClick(element);
    }
    setShowSuggestions(false);
    setSearchQuery('');
  };

  const handleSearchFocus = () => {
    if (searchQuery.trim().length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleSearchBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => setShowSuggestions(false), 150);
  };

  return (
    <div className={styles.mapContainerWrapper}>
      <div className={styles.controlsContainer}>
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search"
            className={styles.searchBar}
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
          />
          <FaSearch className={styles.searchIcon} />
          {showSuggestions && suggestions.length > 0 && (
            <div className={styles.suggestionsContainer}>
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className={styles.suggestionItem}
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent blur from firing before click
                    handleSuggestionClick(suggestion);
                  }}
                >
                  <div className={styles.suggestionContent}>
                    <div className={styles.suggestionAuthor}>
                      {suggestion.author}
                    </div>
                    <div className={styles.suggestionDescription}>
                      {suggestion.description.length > 50
                        ? `${suggestion.description.substring(0, 50)}...`
                        : suggestion.description
                      }
                    </div>
                  </div>
                  {suggestion.images.length > 0 && (
                    <div className={styles.suggestionImage}>
                      <img
                        src={suggestion.images[suggestion.images.length - 1]}
                        alt={`Graffiti by ${suggestion.author}`}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <button onClick={onAddClick} className={styles.addButton}>
          <FaPlus className={styles.plusIcon} />
          <span className={styles.addButtonText}>Add New</span>
        </button>
        <DarkModeToggle />
      </div>
      <MapContainer
        center={center}
        zoom={zoom}
        zoomControl={false}
        maxZoom={21}
        className={styles.mapContainer}
      >
        <MapCenterUpdater center={center} />
        <RightClickHandler onRightClick={onRightClick} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={theme === 'dark'
            ? "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
            : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
          detectRetina={true}
          maxZoom={21}
        />
        {filteredData.map((element) => {
          // Use last image in the array as marker icon
          const markerIcon = element.images[element.images.length - 1];

          const customIcon = new DivIcon({
            className: '',
            iconSize: [40, 50],
            iconAnchor: [20, 50],
            html: `
              <div class="${styles.customMarker}">
                <div class="${styles.markerShape}">
                  <div class="${styles.markerImageContainer}">
                    <img src="${markerIcon}" alt="Graffiti by ${element.author}" class="${styles.markerImage}" />
                  </div>
                </div>
              </div>
            `
          });

          return (
            <Marker
              key={element.id}
              position={element.posix}
              draggable={false}
              icon={customIcon}
              eventHandlers={{
                click: () => {
                  if (onMarkerClick) {
                    onMarkerClick(element);
                  }
                },
                keypress: (event) => {
                  if (
                    event.originalEvent.key === "Enter" ||
                    event.originalEvent.key === " "
                  ) {
                    if (onMarkerClick) {
                      onMarkerClick(element);
                    }
                  }
                },
              }}
            >
            </Marker>
          )
        }
        )}

        {/* User position indicator */}
        {userPosition && (
          <Marker
            position={userPosition}
            icon={new DivIcon({
              className: '',
              iconSize: [15, 15],
              iconAnchor: [7.5, 7.5],
              html: `<div class="${styles.userPositionMarker}"></div>`
            })}
          />
        )}
      </MapContainer >
    </div>
  )
}

export default Map;
