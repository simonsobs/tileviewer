import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { MagnifyingGlass } from './icons/MagnifyingGlass';
import { Dialog } from './Dialog';
import { Map, Feature } from 'ol';
import './styles/center-map-feature.css';
import { Geometry } from 'ol/geom';
import { searchOverlayHelper } from '../utils/externalSearchUtils';
import { raDecToMapCoords } from '../utils/layerUtils';
import { resolveSimbadObject, SimbadResolveError } from '../utils/simbad';

type CenterMapFeatureProps = {
  mapRef: React.RefObject<Map | null>;
  externalSearchRef: React.RefObject<HTMLDivElement | null>;
  externalSearchMarkerRef: React.RefObject<Feature<Geometry> | null>;
  flipped: boolean;
};

type SearchError = {
  message: string;
  detail?: string;
};

export function CenterMapFeature({
  mapRef,
  externalSearchRef,
  externalSearchMarkerRef,
  flipped,
}: CenterMapFeatureProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [error, setError] = useState<SearchError | undefined>(undefined);
  const [isSearching, setIsSearching] = useState(false);
  /** Aborts the in-flight search, so a closed dialog or a newer search isn't overridden by it */
  const searchControllerRef = useRef<AbortController | null>(null);

  const cancelSearch = useCallback(() => {
    searchControllerRef.current?.abort();
    searchControllerRef.current = null;
    setIsSearching(false);
  }, []);

  useEffect(() => cancelSearch, [cancelSearch]);

  const onSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!mapRef.current) return;
      const formData = new FormData(e.target as HTMLFormElement);
      const inputValue = String(formData.get('feature_name')).trim();
      if (!inputValue) return;

      cancelSearch();
      const controller = new AbortController();
      searchControllerRef.current = controller;
      setIsSearching(true);
      setError(undefined);

      try {
        const { ra, dec } = await resolveSimbadObject(
          inputValue,
          controller.signal
        );
        if (controller.signal.aborted || !mapRef.current) return;

        const transformedCoords = raDecToMapCoords([ra, dec], flipped);
        mapRef.current.getView().setCenter(transformedCoords);
        searchOverlayHelper(
          mapRef.current,
          externalSearchRef,
          externalSearchMarkerRef,
          transformedCoords,
          [ra, dec]
        );
        setShowDialog(false);
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(
          e instanceof SimbadResolveError
            ? { message: e.message, detail: e.detail }
            : { message: 'Something went wrong while searching SIMBAD.' }
        );
      } finally {
        if (searchControllerRef.current === controller) {
          searchControllerRef.current = null;
          setIsSearching(false);
        }
      }
    },
    [mapRef, externalSearchRef, externalSearchMarkerRef, flipped, cancelSearch]
  );

  const closeDialog = useCallback(() => {
    cancelSearch();
    setShowDialog(false);
    setError(undefined);
  }, [cancelSearch]);

  return (
    <div className="center-feature-container">
      <button
        type="button"
        className="map-btn"
        title="Go to a feature's position"
        onClick={() => (showDialog ? closeDialog() : setShowDialog(true))}
      >
        <MagnifyingGlass />
      </button>
      {showDialog && (
        <Dialog
          dialogKey="center-feature-dialog"
          openDialog={showDialog}
          closeDialog={closeDialog}
          headerText="Go to Feature"
        >
          <form
            className="center-feature-form generic-form"
            onSubmit={onSubmit}
          >
            <label className="dialog-label">
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
              <div className="feature-search-error" role="alert">
                <h3>Error</h3>
                <p>{error.message}</p>
                {error.detail && (
                  <p className="feature-search-error-detail">{error.detail}</p>
                )}
              </div>
            )}
            <input
              type="submit"
              value={isSearching ? 'Searching…' : 'Go'}
              disabled={isSearching}
            />
          </form>
        </Dialog>
      )}
    </div>
  );
}
