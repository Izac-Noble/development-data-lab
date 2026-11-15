import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Maximize2, Minus, Plus } from 'lucide-react';
import { geoCircle, geoGraticule10, geoNaturalEarth1, geoPath } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { CountryProfile } from '../types';

type CountryFeature = Feature<Geometry, { name: string }>;

const WIDTH = 960;
const HEIGHT = 500;
const MIN_ZOOM = 1;
const MAX_ZOOM = 16;
const BUTTON_ZOOM_STEP = 1.75;
/** Pointer travel (screen px) before a press becomes a drag instead of a click. */
const DRAG_THRESHOLD_PX = 4;

interface View {
  k: number;
  x: number;
  y: number;
}

const HOME_VIEW: View = { k: 1, x: 0, y: 0 };

/** Keeps the zoom in range and the map covering the frame, so it can't be dragged away. */
function clampView({ k, x, y }: View): View {
  return {
    k,
    x: Math.min(0, Math.max(WIDTH * (1 - k), x)),
    y: Math.min(0, Math.max(HEIGHT * (1 - k), y)),
  };
}

/** Zooms by `factor` while keeping the map point under (px, py) fixed on screen. */
function zoomAt(view: View, factor: number, px: number, py: number): View {
  const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.k * factor));
  const ratio = k / view.k;
  return clampView({ k, x: px - (px - view.x) * ratio, y: py - (py - view.y) * ratio });
}

/**
 * Wheel/trackpad zoom toward the cursor, drag to pan, two-finger pinch, double-click to zoom in,
 * plus button actions. Returns `wasDrag()` so click handlers can ignore the click ending a drag.
 */
function useZoomPan(enabled: boolean) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<View>(HOME_VIEW);
  const [animate, setAnimate] = useState(false);
  const [dragging, setDragging] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ dragged: false, downX: 0, downY: 0, pinchDistance: 0, pinchView: HOME_VIEW, pinchMid: { x: 0, y: 0 } });

  /** Screen coordinates to viewBox units (accounts for scaling and letterboxing). */
  const toMapPoint = useCallback((clientX: number, clientY: number) => {
    const ctm = svgRef.current?.getScreenCTM?.();
    if (!ctm) {
      return { x: WIDTH / 2, y: HEIGHT / 2 };
    }
    const point = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: point.x, y: point.y };
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!enabled || !svg) {
      return undefined;
    }
    // Registered natively because React's wheel listener is passive and can't stop page scroll.
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const point = toMapPoint(event.clientX, event.clientY);
      const pixels = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      setAnimate(false);
      setView((current) => zoomAt(current, Math.exp(-pixels * 0.0022), point.x, point.y));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [enabled, toMapPoint]);

  const pinchState = () => {
    const [a, b] = [...pointers.current.values()];
    return { distance: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  };

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!enabled || (event.pointerType === 'mouse' && event.button !== 0)) {
      return;
    }
    pointers.current.set(event.pointerId, toMapPoint(event.clientX, event.clientY));
    if (pointers.current.size === 1) {
      gesture.current.dragged = false;
      gesture.current.downX = event.clientX;
      gesture.current.downY = event.clientY;
    } else if (pointers.current.size === 2) {
      const { distance, mid } = pinchState();
      gesture.current = { ...gesture.current, dragged: true, pinchDistance: distance, pinchView: view, pinchMid: mid };
      setDragging(true);
    }
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) {
      return;
    }
    const point = toMapPoint(event.clientX, event.clientY);
    pointers.current.set(event.pointerId, point);

    if (pointers.current.size >= 2) {
      const { distance, mid } = pinchState();
      const { pinchView, pinchDistance, pinchMid } = gesture.current;
      const zoomed = zoomAt(pinchView, distance / Math.max(pinchDistance, 1), pinchMid.x, pinchMid.y);
      setAnimate(false);
      setView(clampView({ ...zoomed, x: zoomed.x + mid.x - pinchMid.x, y: zoomed.y + mid.y - pinchMid.y }));
      return;
    }

    if (!gesture.current.dragged) {
      const travel = Math.hypot(event.clientX - gesture.current.downX, event.clientY - gesture.current.downY);
      if (travel < DRAG_THRESHOLD_PX) {
        return;
      }
      // Capture only once it's a real drag, so plain clicks still reach the country under the cursor.
      gesture.current.dragged = true;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      setDragging(true);
    }
    setAnimate(false);
    setView((current) => clampView({ ...current, x: current.x + point.x - previous.x, y: current.y + point.y - previous.y }));
  };

  const onPointerEnd = (event: ReactPointerEvent<SVGSVGElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size === 0) {
      setDragging(false);
    }
  };

  const onDoubleClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!enabled) {
      return;
    }
    const point = toMapPoint(event.clientX, event.clientY);
    setAnimate(true);
    setView((current) => zoomAt(current, 2, point.x, point.y));
  };

  const zoomBy = (factor: number) => {
    setAnimate(true);
    setView((current) => zoomAt(current, factor, WIDTH / 2, HEIGHT / 2));
  };

  const reset = () => {
    setAnimate(true);
    setView(HOME_VIEW);
  };

  return {
    svgRef,
    view,
    animate,
    dragging,
    wasDrag: () => gesture.current.dragged,
    handlers: { onPointerDown, onPointerMove, onPointerUp: onPointerEnd, onPointerCancel: onPointerEnd, onDoubleClick },
    zoomIn: () => zoomBy(BUTTON_ZOOM_STEP),
    zoomOut: () => zoomBy(1 / BUTTON_ZOOM_STEP),
    reset,
  };
}

let worldPromise: Promise<CountryFeature[]> | null = null;

/** Lazily loads the bundled Natural Earth 1:110m outlines (kept out of the main chunk). */
function loadWorld(): Promise<CountryFeature[]> {
  worldPromise ??= Promise.all([
    import('world-atlas/countries-110m.json'),
    import('topojson-client'),
  ]).then(([atlasModule, topojson]) => {
    const atlas = atlasModule.default as unknown as Parameters<typeof topojson.feature>[0] & {
      objects: { countries: Parameters<typeof topojson.feature>[1] };
    };
    const collection = topojson.feature(atlas, atlas.objects.countries) as FeatureCollection<
      Geometry,
      { name: string }
    >;
    return collection.features;
  });
  return worldPromise;
}

function useWorldFeatures() {
  const [features, setFeatures] = useState<CountryFeature[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    loadWorld()
      .then((next) => isMounted && setFeatures(next))
      .catch(() => isMounted && setFailed(true));
    return () => {
      isMounted = false;
    };
  }, []);

  return { features, failed };
}

interface WorldMapProps {
  countries: CountryProfile[];
  selectedCountry: string;
  onCountryChange?: (code: string) => void;
  /** Compact mode frames the selected country and its neighbours, without labels. */
  variant?: 'atlas' | 'focus';
}

export function WorldMap({ countries, selectedCountry, onCountryChange, variant = 'atlas' }: WorldMapProps) {
  const { features, failed } = useWorldFeatures();
  const isFocus = variant === 'focus';
  // Enabled only once the <svg> exists (it replaces the loading placeholder), so the native
  // wheel listener attaches to the real element.
  const zoom = useZoomPan(!isFocus && Boolean(features));
  const k = zoom.view.k;

  const catalogByNumeric = useMemo(
    () => new Map(countries.filter((country) => country.isoNumeric).map((country) => [country.isoNumeric!, country])),
    [countries],
  );

  // Small states (e.g. most island nations) have no outline at 1:110m; they are drawn as dots.
  const withoutOutline = useMemo(() => {
    if (!features) {
      return [];
    }
    const outlined = new Set(features.map((feature) => String(feature.id)));
    return countries.filter((country) => !country.isoNumeric || !outlined.has(country.isoNumeric));
  }, [countries, features]);

  const selected = countries.find((country) => country.code === selectedCountry);
  const selectedFeature = features?.find((feature) => feature.id === selected?.isoNumeric);

  const { path, projection } = useMemo(() => {
    const nextProjection = geoNaturalEarth1();
    if (isFocus && (selectedFeature || selected)) {
      // Frame the country's outline, or a small circle around a dot-only country, with
      // generous padding so neighbours stay in view for context.
      const target =
        selectedFeature ?? geoCircle().center([selected!.longitude, selected!.latitude]).radius(4)();
      const pad = Math.min(WIDTH, HEIGHT) * 0.32;
      nextProjection.fitExtent(
        [
          [pad, pad],
          [WIDTH - pad, HEIGHT - pad],
        ],
        target,
      );
    } else {
      nextProjection.fitExtent(
        [
          [8, 8],
          [WIDTH - 8, HEIGHT - 8],
        ],
        { type: 'Sphere' },
      );
    }
    return { path: geoPath(nextProjection), projection: nextProjection };
  }, [isFocus, selectedFeature, selected]);

  const label = isFocus ? `${selected?.name ?? selectedCountry} location map` : 'World map of countries';

  if (failed) {
    return <div className="world-map-status">Map outlines could not be loaded.</div>;
  }

  if (!features) {
    return (
      <div className="world-map-status" role="status">
        Loading map…
      </div>
    );
  }

  const selectedPoint = selected ? projection([selected.longitude, selected.latitude]) : null;
  const interactive = Boolean(onCountryChange && !isFocus);
  const select = (code: string) => {
    if (!zoom.wasDrag()) {
      onCountryChange?.(code);
    }
  };

  const svgClassName = ['world-map', isFocus ? 'focus' : 'pannable', zoom.dragging && 'dragging'].filter(Boolean).join(' ');

  const svg = (
    <svg
      ref={zoom.svgRef}
      className={svgClassName}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={label}
      {...(isFocus ? {} : zoom.handlers)}
    >
      <g
        className={zoom.animate ? 'zoom-layer animate' : 'zoom-layer'}
        style={{ transform: `translate(${zoom.view.x}px, ${zoom.view.y}px) scale(${k})`, transformOrigin: '0 0' }}
      >
        <path className="world-sphere" d={path({ type: 'Sphere' }) ?? undefined} />
        <path className="world-graticule" d={path(geoGraticule10()) ?? undefined} />
        {features.map((feature) => {
          const catalogCountry = catalogByNumeric.get(String(feature.id));
          const isSelected = Boolean(catalogCountry && catalogCountry.code === selectedCountry);
          const canSelect = Boolean(catalogCountry && interactive);
          const className = ['land', isSelected && 'selected', !catalogCountry && 'no-data', canSelect && 'interactive']
            .filter(Boolean)
            .join(' ');

          return (
            <path
              key={String(feature.id ?? feature.properties.name)}
              className={className}
              d={path(feature) ?? undefined}
              onClick={canSelect ? () => select(catalogCountry!.code) : undefined}
            >
              <title>{catalogCountry ? catalogCountry.name : `${feature.properties.name} (no data)`}</title>
            </path>
          );
        })}
        {withoutOutline.map((country) => {
          const point = projection([country.longitude, country.latitude]);
          if (!point) {
            return null;
          }
          const isSelected = country.code === selectedCountry;
          return (
            <circle
              key={country.code}
              className={['island-dot', isSelected && 'selected', interactive && 'interactive'].filter(Boolean).join(' ')}
              cx={point[0]}
              cy={point[1]}
              r={(isFocus ? 7 : 3) / k}
              onClick={interactive ? () => select(country.code) : undefined}
            >
              <title>{country.name}</title>
            </circle>
          );
        })}
        {!isFocus && selected && selectedPoint && (
          <g
            className="map-marker active"
            transform={`translate(${selectedPoint[0]}, ${selectedPoint[1]}) scale(${1 / k})`}
            aria-hidden="true"
          >
            <circle r={7} />
            {/* Near the right edge the label flips to the left of the dot so it stays on the map. */}
            <text
              x={selectedPoint[0] * k + zoom.view.x > WIDTH * 0.78 ? -13 : 13}
              y={7}
              textAnchor={selectedPoint[0] * k + zoom.view.x > WIDTH * 0.78 ? 'end' : 'start'}
            >
              {selected.name}
            </text>
          </g>
        )}
      </g>
    </svg>
  );

  if (isFocus) {
    return svg;
  }

  return (
    <>
      {svg}
      <div className="map-zoom-controls">
        <button type="button" onClick={zoom.zoomIn} disabled={k >= MAX_ZOOM} aria-label="Zoom in" title="Zoom in">
          <Plus size={16} />
        </button>
        <button type="button" onClick={zoom.zoomOut} disabled={k <= MIN_ZOOM} aria-label="Zoom out" title="Zoom out">
          <Minus size={16} />
        </button>
        <button type="button" onClick={zoom.reset} disabled={k === 1} aria-label="Reset map view" title="Reset view">
          <Maximize2 size={14} />
        </button>
      </div>
      <p className="map-hint">Scroll or pinch to zoom · drag to move · double-click to zoom in</p>
    </>
  );
}
