import { FormEvent, useCallback, useState } from 'react';
import { MagnifyingGlass } from './icons/MagnifyingGlass';
import { Dialog } from './Dialog';
import { Map, Feature } from 'ol';
import './styles/center-map-feature.css';
import { Geometry } from 'ol/geom';
import { searchOverlayHelper } from '../utils/externalSearchUtils';

type CenterMapFeatureProps = {
  mapRef: React.RefObject<Map | null>;
  externalSearchRef: React.RefObject<HTMLDivElement | null>;
  externalSearchMarkerRef: React.RefObject<Feature<Geometry> | null>;
  flipTiles: boolean;
};

export function CenterMapFeature({
  mapRef,
  externalSearchRef,
  externalSearchMarkerRef,
  flipTiles,
}: CenterMapFeatureProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const onSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!mapRef.current) return;
      const formData = new FormData(e.target as HTMLFormElement);
      const inputValue = String(formData.get('feature_name'));
      if (inputValue) {
        const response = await fetch(
          'https://simbad.cds.unistra.fr/simbad/sim-script?script=' +
            encodeURIComponent(
              `output console display ascii
                    format object "%COO(d;A) %COO(d;D)"
                    query id ${inputValue}`
            )
        );
        const text = await response.text();

        // Extract the ::data:: section
        const dataMatch = text.match(/::data::+[\s\S]*?([\d.+-]+\s+[\d.+-]+)/);
        if (!dataMatch) {
          setError(`RA/Dec not found in SIMBAD response to: ${inputValue}`);
          return;
        }

        // Extract ra, dec values
        const [raStr, decStr] = dataMatch[1].trim().split(/\s+/);
        const ra = parseFloat(raStr);
        const dec = parseFloat(decStr);

        if (!isNaN(ra) && !isNaN(dec)) {
          mapRef.current.getView().setCenter([ra, dec]);
          searchOverlayHelper(
            mapRef.current,
            externalSearchRef,
            externalSearchMarkerRef,
            [ra, dec],
            flipTiles
          );
          setShowDialog(false);
          if (error) {
            setError(undefined);
          }
        }
      }
    },
    [mapRef, externalSearchRef, externalSearchMarkerRef, flipTiles]
  );

  const closeDialog = useCallback(() => {
    setShowDialog(false);
    setError(undefined);
  }, []);

  return (
    <div className="center-feature-container">
      <button
        type="button"
        className="map-btn"
        title="Go to a feature's position"
        onClick={() => setShowDialog(!showDialog)}
      >
        <MagnifyingGlass width={18} height={18} />
      </button>
      {showDialog && (
        <Dialog
          dialogKey="center-feature-dialog"
          openDialog={showDialog}
          closeDialog={closeDialog}
          headerText="Go to Feature"
        >
          <form className="center-feature-form" onSubmit={onSubmit}>
            <label>
              Feature Name:
              <input
                name="feature_name"
                required
                style={{ minWidth: 300 }}
                placeholder="Enter a feature's name"
                type="text"
              />
            </label>
            {error && (
              <div className="feature-search-error">
                <h3>Error</h3>
                <p>{error}</p>
                <p>Please try again.</p>
              </div>
            )}
            <input type="submit" value="Go" />
          </form>
        </Dialog>
      )}
    </div>
  );
}
