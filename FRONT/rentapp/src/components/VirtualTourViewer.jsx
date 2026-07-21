import React, { useEffect, useRef, useState, useCallback } from 'react';
import Marzipano from 'marzipano';
import api from '../services/authService';
import './VirtualTourViewer.css';

/* ──────────────────────────────────────────────────────────────────────────────
   VirtualTourViewer
   ─────────────────────────────────────────────────────────────────────────────
   Memory-safe 360° viewer strategy
   ────────────────────────────────────────────────────────────────────────────
   • NO upfront image pre-loading. Images are fetched by Marzipano on demand
     using absolute HTTP URLs returned by the Django serializer.
   • The Marzipano viewer is created ONCE and reused. Only scene objects (which
     are lightweight) are built for every room at init time — the actual image
     tiles are fetched lazily when a scene becomes active.
   • Only ONE scene is displayed at a time; we call switchTo() which unloads
     the previous scene's tiles from GPU memory automatically.
   • Viewer is destroyed on component unmount to release all GPU resources.
────────────────────────────────────────────────────────────────────────────── */

const VirtualTourViewer = ({ propertyId, onClose }) => {
  const panoRef   = useRef(null);
  const viewerRef = useRef(null);

  const [tourData,    setTourData]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [loadingMsg,  setLoadingMsg]  = useState('Loading tour data…');
  const [error,       setError]       = useState(null);
  const [currentRoom, setCurrentRoom] = useState('');
  const scenesMapRef = useRef({});                         // { roomId: { scene, data } }
  const [roomList,    setRoomList]    = useState([]);    // ordered room data for sidebar

  // ── 1. Fetch tour payload ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const fetchTour = async () => {
      try {
        setLoading(true);
        setLoadingMsg('Loading tour data…');
        const res  = await api.get(`/api/property/${propertyId}/tour/`);
        const data = res.data;
        if (cancelled) return;

        if (!data.rooms || data.rooms.length === 0) {
          setError('No virtual tour rooms are configured for this property.');
          setLoading(false);
          return;
        }
        setTourData(data);
      } catch (err) {
        if (cancelled) return;
        console.error('VirtualTour: failed to fetch tour data', err);
        setError('Failed to load virtual tour data. Please try again.');
        setLoading(false);
      }
    };

    fetchTour();

    return () => {
      cancelled = true;
      // Destroy Marzipano viewer to free all GPU/CPU resources
      if (viewerRef.current) {
        try { viewerRef.current.destroy(); } catch (_) { /* ignore */ }
        viewerRef.current = null;
      }
    };
  }, [propertyId]);

  // ── 2. Build Marzipano scenes (lightweight – no image decoding yet) ────────
  useEffect(() => {
    if (!tourData || !panoRef.current) return;

    setLoadingMsg('Initialising viewer…');

    // Destroy any previous viewer instance
    if (viewerRef.current) {
      try { viewerRef.current.destroy(); } catch (_) { /* ignore */ }
      viewerRef.current = null;
    }

    const viewer = new Marzipano.Viewer(panoRef.current, {
      controls: { mouseViewMode: 'drag' },
    });
    viewerRef.current = viewer;

    // Shared geometry & view settings
    const geometry = new Marzipano.EquirectGeometry([{ width: 4096 }]);
    const limiter  = Marzipano.RectilinearView.limit.traditional(
      4096,
      120 * Math.PI / 180
    );

    const rooms = tourData.rooms;
    const newScenes = {};

    rooms.forEach(room => {
      // Prefer the absolute image_url provided by the serializer
      const imageUrl = room.image_url || room.image;
      if (!imageUrl) return;

      const view   = new Marzipano.RectilinearView(
        { pitch: 0, yaw: 0, fov: Math.PI / 2 },
        limiter
      );
      // Marzipano fetches this URL lazily when the scene becomes active
      const source = Marzipano.ImageUrlSource.fromString(imageUrl);
      const scene  = viewer.createScene({ source, geometry, view, pinFirstLevel: false });

      newScenes[room.id] = { scene, data: room };
    });

    // Attach hotspot DOM elements
    rooms.forEach(room => {
      const entry = newScenes[room.id];
      if (!entry || !room.hotspots || room.hotspots.length === 0) return;

      room.hotspots.forEach(hotspot => {
        const el = document.createElement('div');
        el.className = 'tour-hotspot';

        const icon = document.createElement('div');
        icon.className = 'tour-hotspot-icon';
        icon.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 8 12 12 14 14"/>
          </svg>`;

        const label = document.createElement('div');
        label.className = 'tour-hotspot-title';
        label.innerText = hotspot.title;

        el.appendChild(icon);
        el.appendChild(label);

        const pitchRad = ((hotspot.pitch || 0) * Math.PI) / 180;
        const yawRad   = ((hotspot.yaw   || 0) * Math.PI) / 180;

        // Listener is added immediately so it works even when scene switches
        el.addEventListener('click', () => switchToRoom(hotspot.target_room_id));

        entry.scene
          .hotspotContainer()
          .createHotspot(el, { pitch: pitchRad, yaw: yawRad });
      });
    });

    scenesMapRef.current = newScenes;
    setRoomList(rooms);

    // Switch to initial room
    const initialId = tourData.initial_room_id || rooms[0]?.id;
    const first     = newScenes[initialId] || Object.values(newScenes)[0];
    if (first) {
      first.scene.switchTo({ transitionDuration: 600 });
      setCurrentRoom(first.data.room_name);
    }

    setLoading(false);
  }, [tourData]);   // eslint-disable-line react-hooks/exhaustive-deps

  // ── 3. (Removed: Hotspot click events are now wired during creation) ────────

  // ── 4. Room switching ──────────────────────────────────────────────────────
  const switchToRoom = useCallback((roomId) => {
    const target = scenesMapRef.current[roomId];
    if (target) {
      target.scene.switchTo({ transitionDuration: 600 });
      setCurrentRoom(target.data.room_name);
    }
  }, []);

  // ── 5. Zoom helpers ────────────────────────────────────────────────────────
  const handleZoom = (factor) => {
    if (!viewerRef.current) return;
    const view = viewerRef.current.view();
    if (view) view.setFov(view.fov() * factor);
  };

  // ── 6. Render ──────────────────────────────────────────────────────────────
  return (
    <div className="virtual-tour-overlay">
      <div className="virtual-tour-container">

        {/* ── Header ── */}
        <div className="virtual-tour-header">
          <div className="virtual-tour-info">
            <h2>{tourData ? tourData.property_title : 'Virtual Tour'}</h2>
            {currentRoom && <span className="current-room-badge">{currentRoom}</span>}
          </div>
          <button
            className="virtual-tour-close"
            onClick={onClose}
            aria-label="Close tour"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2.5"
                 strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6"  x2="6"  y2="18"/>
              <line x1="6"  y1="6"  x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="virtual-tour-content">

          {/* Loading overlay */}
          {loading && (
            <div className="tour-loading">
              <div className="tour-spinner" />
              <p>{loadingMsg}</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="tour-error">
              <svg width="48" height="48" viewBox="0 0 24 24"
                   fill="none" stroke="#ef4444" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8"  x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p>{error}</p>
            </div>
          )}

          {/* Panorama canvas – always mounted so viewerRef can attach */}
          <div
            ref={panoRef}
            className="tour-pano-container"
            style={{ visibility: (loading || error) ? 'hidden' : 'visible' }}
          />

          {/* Room navigation sidebar */}
          {!loading && !error && roomList.length > 1 && (
            <div className="tour-room-nav">
              {roomList.map(room => (
                <button
                  key={room.id}
                  className={`tour-room-btn${currentRoom === room.room_name ? ' active' : ''}`}
                  onClick={() => switchToRoom(room.id)}
                  title={room.room_name}
                >
                  <span className="tour-room-icon">🏠</span>
                  <span className="tour-room-label">{room.room_name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Zoom controls */}
          {!loading && !error && (
            <div className="tour-controls">
              <button
                className="tour-control-btn"
                onClick={() => handleZoom(0.85)}
                title="Zoom In"
              >
                <svg width="20" height="20" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  <line x1="11" y1="8"  x2="11"    y2="14"/>
                  <line x1="8"  y1="11" x2="14"    y2="11"/>
                </svg>
              </button>
              <button
                className="tour-control-btn"
                onClick={() => handleZoom(1.15)}
                title="Zoom Out"
              >
                <svg width="20" height="20" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  <line x1="8"  y1="11" x2="14"    y2="11"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VirtualTourViewer;
