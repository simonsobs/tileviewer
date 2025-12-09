import { Map, Feature } from 'ol';
import { useEffect, useState, useRef } from 'react';
import { ApertureIcon } from '../icons/ApertureIcon';
import '../styles/aperture-layer.css';
import Draw from 'ol/interaction/Draw';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { Style, Stroke } from 'ol/style';
import { Circle } from 'ol/geom';
import { SERVICE_URL } from '../../configs/mapSettings';

type AperturesLayerProps = {
  mapRef: React.RefObject<Map | null>;
  activeBaselayerId: string | undefined;
};

export interface ApertureRequest {
  layer_id: string;
  ra: number;
  dec: number;
  radius: number; // in meters
}

interface ApertureResponse extends ApertureRequest {
  mean: number;
  std: number;
  max: number;
  min: number;
}

export function AperturesLayer({
  mapRef,
  activeBaselayerId,
}: AperturesLayerProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [apertures, setApertures] = useState<ApertureResponse[]>([]);

  const hasMaximum = apertures.length === 3;
  const title = hasMaximum
    ? 'At maximum number of data overlays'
    : 'Add up to 3 data overlays';

  const sourceRef = useRef<VectorSource | null>(null);
  const layerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const apertureOneRef = useRef<HTMLDivElement>(null);
  const drawRef = useRef<Draw | null>(null);
  const [newAperture, setNewAperture] = useState<ApertureRequest | undefined>(
    undefined
  );

  useEffect(() => {
    if (!mapRef.current) return;

    const source = new VectorSource();
    const layer = new VectorLayer({ source });
    mapRef.current.addLayer(layer);

    layerRef.current = layer;

    return () => {
      mapRef.current?.removeLayer(layer);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isDrawing) return;

    // 1. Create vector source
    const source = new VectorSource();

    // 2. Create vector layer
    const layer = new VectorLayer({
      source,
    });
    layer.setZIndex(1000);
    map.addLayer(layer);

    // 3. Create Draw interaction
    const draw = new Draw({
      source,
      type: 'Circle',
    });
    drawRef.current = draw;
    map.addInteraction(draw);

    // 4. Handle circle creation
    draw.on('drawend', (evt) => {
      const feature = evt.feature;
      const geom = feature.getGeometry() as Circle;
      // Convert geometry to RA/Dec + radius
      const [ra, dec] = geom.getCenter();
      const radius = geom.getRadius() * 60; // convert degrees to arcmin
      const layer_id = feature.ol_uid;
      const circleData: ApertureRequest = { layer_id, ra, dec, radius };
      setNewAperture(circleData);
      setIsDrawing(false);
      map.removeLayer(layer);
    });

    // 5. Delete circle on click
    const handleClick = (evt: any) => {
      map.forEachFeatureAtPixel(evt.pixel, (feature) => {
        if (source.hasFeature(feature)) {
          const id = feature.ol_uid;
          console.log(feature);
          // source.removeFeature(feature);
          //   setCircles((prev) => prev.filter((c) => c.id !== id));
        }
      });
    };
    map.on('singleclick', handleClick);

    return () => {
      // map.un("singleclick", handleClick);
      map.removeInteraction(draw);
      // map.removeLayer(layer);
    };
  }, [isDrawing]);

  useEffect(() => {
    if (newAperture === undefined) return;
    async function fetchAperture() {
      if (newAperture === undefined) return;
      const { ra, dec, radius } = newAperture;
      const apertureData = await fetch(
        `${SERVICE_URL}/analysis/aperture/${activeBaselayerId}?ra=${ra}&dec=${dec}&radius=${radius}`
      );

      const response = (await apertureData.json()) as ApertureResponse;

      setApertures((prev) => prev.concat(response));

      const source = new VectorSource();

      const layer = new VectorLayer({
        source,
        style: new Style({
          stroke: new Stroke({ width: 2 }),
        }),
      });

      mapRef.current?.addLayer(layer);

      const circle = new Circle([ra, dec], radius / 60);
      const feature = new Feature(circle);

      source.addFeature(feature);

      if (apertureOneRef.current) {
        generateContent(apertureOneRef.current, response);
      }
    }

    fetchAperture();
    setNewAperture(undefined);
  }, [newAperture, activeBaselayerId]);

  return (
    <>
      <div className="draw-aperture-btn-container">
        <button
          type="button"
          className="map-btn"
          title={title}
          onClick={() => setIsDrawing(true)}
          disabled={isDrawing || hasMaximum}
        >
          <ApertureIcon />
        </button>
      </div>
      <div ref={apertureOneRef} />
    </>
  );
}

function generateContent(el: HTMLDivElement, data: ApertureResponse) {
  const p = document.createElement('p');
  p.textContent = data.mean.toString();
  el.appendChild(p);
}
