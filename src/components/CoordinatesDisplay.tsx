import { useCallback, useEffect, useRef, useState, FormEvent } from 'react';
import { Map, Feature, MapBrowserEvent } from 'ol';
import { Geometry } from 'ol/geom';
import { NUMBER_OF_FIXED_COORDINATE_DECIMALS } from '../configs/mapSettings';
import { transformGraticuleCoords } from '../utils/layerUtils';
import './styles/coordinates-display.css';
import { searchOverlayHelper } from '../utils/externalSearchUtils';

export function CoordinatesDisplay({
  flipped,
  mapObj,
  externalSearchRef,
  externalSearchMarkerRef,
}: {
  flipped: boolean;
  mapObj: Map;
  externalSearchRef: React.RefObject<HTMLDivElement | null>;
  externalSearchMarkerRef: React.RefObject<Feature<Geometry> | null>;
}) {
  const [coordinates, setCoordinates] = useState<number[] | undefined>(
    undefined
  );
  const [showCoordInputs, setShowCoordInputs] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!showCoordInputs) {
        setShowCoordInputs(true);
      }
    },
    [showCoordInputs]
  );

  useEffect(() => {
    if (showCoordInputs) {
      firstInputRef.current?.focus();
    }
  }, [showCoordInputs]);

  useEffect(() => {
    function handleDocClick(e: MouseEvent) {
      if (!formRef.current) return;
      // If the click happened outside the form, close it
      if (!formRef.current.contains(e.target as Node)) {
        setShowCoordInputs(false);
      }
    }

    document.addEventListener('click', handleDocClick);
    return () => {
      document.removeEventListener('click', handleDocClick);
    };
  }, []);

  useEffect(() => {
    const currentMapRef = mapObj;
    const updateCoords = (e: MapBrowserEvent) => setCoordinates(e.coordinate);
    currentMapRef.on('pointermove', updateCoords);
    return () => currentMapRef.un('pointermove', updateCoords);
  }, []);

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const formData = new FormData(e.target as HTMLFormElement);
      const raStr = String(formData.get('ra'));
      const decStr = String(formData.get('dec'));

      if (raStr.length && decStr.length) {
        const ra = parseFloat(raStr);
        const dec = parseFloat(decStr);
        if (!isNaN(ra) && !isNaN(dec)) {
          const transformedCoords = transformGraticuleCoords(
            [ra, dec],
            flipped
          );
          mapObj.getView().setCenter(transformedCoords);
          searchOverlayHelper(
            mapObj,
            externalSearchRef,
            externalSearchMarkerRef,
            transformedCoords,
            [ra, dec]
          );
        }
      }

      setShowCoordInputs(false);
      (e.target as HTMLFormElement).reset();
    },
    [mapObj, externalSearchRef, externalSearchMarkerRef, flipped]
  );

  // Return early if coordinates aren't defined
  if (!coordinates) return;

  const transformedCoords = transformGraticuleCoords(coordinates, flipped);
  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      onClick={onClick}
      className="coordinates-display"
    >
      <span className="parens">( </span>
      <span
        className="coords lat"
        style={{ display: !showCoordInputs ? 'inline-block' : 'none' }}
      >
        {transformedCoords[0].toFixed(NUMBER_OF_FIXED_COORDINATE_DECIMALS)}
      </span>
      <span
        className="coords"
        style={{ display: showCoordInputs ? 'inline-block' : 'none' }}
      >
        <input
          ref={firstInputRef}
          required
          name="ra"
          className="coords-input"
          type="text"
          placeholder="Enter RA..."
        />
      </span>
      <span className="coords-delimiter">,</span>
      <span
        className="coords lng"
        style={{ display: !showCoordInputs ? 'inline-block' : 'none' }}
      >
        {transformedCoords[1].toFixed(NUMBER_OF_FIXED_COORDINATE_DECIMALS)}
      </span>
      <span
        className="coords"
        style={{ display: showCoordInputs ? 'inline-block' : 'none' }}
      >
        <input
          required
          name="dec"
          className="coords-input"
          type="text"
          placeholder="Enter Dec..."
        />
      </span>
      <span className="parens"> )</span>
      <input type="submit" style={{ display: 'none' }} aria-hidden={true} />
    </form>
  );
}
