'use client';

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { LatLngExpression, LatLngTuple, DivIcon, LeafletMouseEvent } from 'leaflet';
import styles from './Map.module.css';
import { useState, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { FaSearch, FaPlus } from 'react-icons/fa';

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
  const { zoom = defaults.zoom, center = defaults.center, data, onMarkerClick, onAddClick, onRightClick } = props;
  const [searchQuery, setSearchQuery] = useState('');

  // Filter data based on search query
  const filteredData = data.filter(element => {
    const query = searchQuery.toLowerCase();
    return (
      element.author.toLowerCase().includes(query) ||
      element.description.toLowerCase().includes(query)
    );
  });

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
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
          />
          <FaSearch className={styles.searchIcon} />
        </div>
        <button onClick={onAddClick} className={styles.addButton}>
          <FaPlus className={styles.plusIcon} />
          <span className={styles.addButtonText}>Add New</span>
        </button>
      </div>
      <MapContainer
        center={center}
        zoom={zoom}
        zoomControl={false}
        style={{ height: "100%", width: "100%" }}
        className={styles.map}
      >
        <MapCenterUpdater center={center} />
        <RightClickHandler onRightClick={onRightClick} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          detectRetina={true}
        />
        {filteredData.map((element) => { // Use filteredData instead of data
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
      </MapContainer >
    </div>
  )
}

export default Map;
