import { useEffect, useState, useRef, useCallback } from 'react';
import { Map } from 'ol';
import { ApertureIcon } from '../icons/ApertureIcon';
import Draw from 'ol/interaction/Draw';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { Style, Stroke, Text, Fill } from 'ol/style';
import { Circle } from 'ol/geom';
import { SERVICE_URL } from '../../configs/mapSettings';
import {
  transformCoords,
  transformFeatureCoords,
} from '../../utils/layerUtils';
import Select from 'ol/interaction/Select';
import { click } from 'ol/events/condition';
import Feature from 'ol/Feature';
import type { FeatureLike } from 'ol/Feature';
import '../styles/aperture-layer.css';
import { Coordinate } from 'ol/coordinate';

type AperturesLayerProps = {
  mapRef: React.RefObject<Map | null>;
  activeBaselayerId: string | undefined;
  flipped: boolean;
};

export interface ApertureRequestData {
  ra: number;
  dec: number;
  radius: number; // in meters
}

export interface ApertureResponse extends ApertureRequestData {
  layer_id: string;
  mean: number;
  std: number;
  max: number;
  min: number;
}

interface ApertureResponseWithId extends ApertureResponse {
  id: string;
}

export function AperturesLayer({
  mapRef,
  activeBaselayerId,
  flipped,
}: AperturesLayerProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [apertures, setApertures] = useState<ApertureResponseWithId[]>([]);
  const [selectedApertureId, setSelectedApertureId] = useState<
    string | undefined
  >(undefined);

  const isExternalBaselayer = activeBaselayerId?.includes('external');
  const hasMaximum = apertures.length === 3;
  const title = isExternalBaselayer
    ? 'This feature is not compatible with external baselayers'
    : hasMaximum
      ? 'At maximum number of data overlays'
      : 'Add up to 3 data overlays';

  const aperturesLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const aperturesSourceRef = useRef<VectorSource | null>(null);
  const selectInteractionRef = useRef<Select | null>(null);
  const [newAperture, setNewAperture] = useState<
    ApertureRequestData | undefined
  >(undefined);

  /**
   * Create and attach keyboard event that deletes apertures after being clicked on
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedApertureId || !aperturesSourceRef.current) return;
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;

      const featureToDelete =
        aperturesSourceRef.current.getFeatureById(selectedApertureId);
      if (!featureToDelete) return;

      aperturesSourceRef.current.removeFeature(featureToDelete);
      setApertures((prev) => prev.filter((a) => a.id !== selectedApertureId));
      setSelectedApertureId(undefined);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedApertureId]);

  /**
   * Handles the logic that draws the aperture on the map, which then
   * sets the circle's ra, dec, and radius in React state in order to trigger
   * downstream actions
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isDrawing) return;

    const drawApertureSource = new VectorSource();

    const drawApertureLayer = new VectorLayer({
      source: drawApertureSource,
      zIndex: 3000,
    });
    map.addLayer(drawApertureLayer);

    const drawApertureInteraction = new Draw({
      source: drawApertureSource,
      type: 'Circle',
      geometryFunction: (coordinates, geometry) => {
        const center = coordinates[0] as Coordinate;
        const last = coordinates[coordinates.length - 1] as Coordinate;
        const dx = center[0] - last[0];
        const dy = center[1] - last[1];
        const maxRadius = 0.5; // in degrees
        const radius = Math.min(Math.sqrt(dx * dx + dy * dy), maxRadius);
        if (!geometry) {
          geometry = new Circle(center, radius);
        } else {
          (geometry as Circle).setCenterAndRadius(center, radius);
        }
        return geometry;
      },
    });
    map.addInteraction(drawApertureInteraction);

    // Define a 'drawend' callback that gets the circle's geometry and passes the data into React state
    drawApertureInteraction.on('drawend', (evt) => {
      const feature = evt.feature;
      const geom = feature.getGeometry() as Circle;
      const [ra, dec] = geom.getCenter();
      const radius = geom.getRadius() * 60; // convert degrees to arcmin
      const circleData = { ra, dec, radius };
      setNewAperture(circleData);
      setIsDrawing(false);

      // Remove layer when drawing is finished, noting that a different useEffect will fetch
      // the data and use render the actual aperture
      map.removeLayer(drawApertureLayer);
    });

    return () => {
      map.removeInteraction(drawApertureInteraction);
    };
  }, [isDrawing]);

  /**
   * A style function that's cached in a callback that allows us to render the aperture data
   * that's stored on the feature, plus we can conditionally change styles based on the feature's
   * 'selected' state
   */
  const apertureStyle = useCallback(
    (feature: FeatureLike, resolution: number) => {
      const data = feature.get('data');
      const selected = feature.get('selected');
      const geom = feature.getGeometry() as Circle;

      if (!data || !geom) return;

      const radiusInMapUnits = geom.getRadius();
      const radiusInPixels = radiusInMapUnits / resolution;

      return new Style({
        fill: new Fill({
          color: selected ? 'rgba(189,33,48,0.2)' : 'rgba(0,0,0,0)',
        }),
        stroke: new Stroke({
          color: selected ? 'rgb(189,33,48)' : '#000',
          width: selected ? 3 : 2,
        }),
        text: new Text({
          text: data
            ? [
                'Mean',
                'bold 11px monospace',
                ` ${data.mean}`,
                '11px monospace',
                '\n',
                '',
                'Std',
                'bold 11px monospace',
                ` ${data.std}`,
                '11px monospace',
                '\n',
                '',
                'Max',
                'bold 11px monospace',
                ` ${data.max}`,
                '11px monospace',
                '\n',
                '',
                'Min',
                'bold 11px monospace',
                ` ${data.min}`,
                '11px monospace',
              ]
            : '',
          textAlign: 'start',
          offsetX: radiusInPixels + 10,
          placement: 'point',
          backgroundFill: new Fill({ color: 'rgba(255,255,255,0.5)' }),
          padding: [2, 5, 2, 5],
        }),
      });
    },
    []
  );

  /**
   * Creates a single layer, source, and interaction that aperture features will be associated with then assigns them to
   * refs that can be used elsewhere
   */
  useEffect(() => {
    if (!mapRef.current) return;

    const aperturesSource = new VectorSource();
    const aperturesLayer = new VectorLayer({
      source: aperturesSource,
      style: apertureStyle,
      zIndex: 3000,
    });

    const selectInteraction = new Select({
      layers: [aperturesLayer],
      condition: click,
      style: null,
    });

    mapRef.current.addLayer(aperturesLayer);
    mapRef.current.addInteraction(selectInteraction);

    aperturesLayerRef.current = aperturesLayer;
    aperturesSourceRef.current = aperturesSource;
    selectInteractionRef.current = selectInteraction;

    selectInteraction.on('select', (e) => {
      e.deselected.forEach((f) => {
        setSelectedApertureId(undefined);
        f.set('selected', false);
        f.changed();
      });
      e.selected.forEach((f) => {
        setSelectedApertureId(f.getId() as string);
        f.set('selected', true);
        f.changed();
      });
    });

    return () => {
      mapRef.current?.removeInteraction(selectInteraction);
      mapRef.current?.removeLayer(aperturesLayer);
    };
  }, []);

  /**
   * Triggered primarily when a new aperture is drawn on the map, thereby fetching the data, creating
   * a feature, and adding the feature to the map and to React state
   */
  useEffect(() => {
    async function fetchAperture() {
      if (!newAperture || !aperturesSourceRef.current || !activeBaselayerId)
        return;
      const { ra, dec, radius } = newAperture;

      let transformedRa = ra;
      if (flipped) {
        transformedRa = transformCoords([ra, dec], flipped, 'layer')[0];
      }

      const apertureData = await fetch(
        `${SERVICE_URL}/analysis/aperture/${activeBaselayerId}?ra=${transformedRa}&dec=${dec}&radius=${radius}`
      );

      const id = crypto.randomUUID();
      const response = (await apertureData.json()) as ApertureResponse;

      const circle = new Circle([ra, dec], radius / 60);
      const newApertureFeature = new Feature({
        geometry: circle,
        data: {
          ...response,
          ra: transformedRa,
        },
      });

      newApertureFeature.setId(id);
      newApertureFeature.set('selected', false);

      aperturesSourceRef.current.addFeature(newApertureFeature);

      setApertures((prev) => prev.concat({ id, ...response }));
    }

    fetchAperture();
    setNewAperture(undefined);
  }, [newAperture, activeBaselayerId, flipped]);

  /**
   * Updates aperture positions when the map's 'flipped' state changes
   */
  useEffect(() => {
    aperturesSourceRef.current?.getFeatures().forEach((feature) => {
      const circleGeometry = feature.getGeometry() as Circle;
      const { newOverlayCoords } = transformFeatureCoords(feature, flipped);
      circleGeometry.setCenter(newOverlayCoords);
      feature.changed();
    });
  }, [flipped]);

  /**
   * Re-fetches data for the apertures to display when the baselayer is changed
   * NOTE: if an external layer is set, we make the apertures layer invisible
   */
  useEffect(() => {
    async function refreshApertureText() {
      if (!activeBaselayerId) return;
      if (activeBaselayerId.includes('external')) {
        aperturesLayerRef.current?.setVisible(false);
        return;
      } else {
        aperturesLayerRef.current?.setVisible(true);
        aperturesSourceRef.current?.getFeatures().forEach(async (feature) => {
          const data = feature.get('data');

          const apertureData = await fetch(
            `${SERVICE_URL}/analysis/aperture/${activeBaselayerId}?ra=${data.ra}&dec=${data.dec}&radius=${data.radius}`
          );
          const response = (await apertureData.json()) as ApertureResponse;
          feature.set('data', {
            ...response,
            ra: data.ra,
          });
          feature.changed();
        });
      }
    }
    refreshApertureText();
  }, [activeBaselayerId]);

  return (
    <>
      <div className="draw-aperture-btn-container">
        <button
          type="button"
          className="map-btn"
          title={title}
          onClick={() => setIsDrawing(true)}
          disabled={isDrawing || hasMaximum || isExternalBaselayer}
        >
          <ApertureIcon />
        </button>
      </div>
    </>
  );
}
