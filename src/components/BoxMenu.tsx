import { ReactNode, useCallback, useState } from 'react';
import { BoxWithDimensions, NewBoxData, SubmapData } from '../types/submaps';
import { MenuIcon } from './icons/MenuIcon';
import {
  SUBMAP_DOWNLOAD_OPTIONS,
  SubmapFileExtensions,
} from '../configs/submapConfigs';
import { transformBoxCoords } from '../utils/layerUtils';
import { Map } from 'ol';
import { mapApi } from '../api/client';
import { Spinner } from './LoadingOverlay';

type BoxMenuProps = {
  isNewBox: boolean;
  boxData: BoxWithDimensions | NewBoxData;
  setShowMenu: (showMenu: boolean) => void;
  showMenu: boolean;
  additionalButtons?: ReactNode[];
  submapData?: SubmapData;
  showMenuOverlay?: boolean;
  flipped: boolean;
  mapRef: React.RefObject<Map | null>;
};

export function BoxMenu({
  isNewBox,
  boxData,
  setShowMenu,
  showMenu,
  additionalButtons = [],
  submapData,
  showMenuOverlay,
  flipped,
  mapRef,
}: BoxMenuProps) {
  const map = mapRef.current;

  // Which download (if any) is currently in flight, and the error from the
  // last attempt if it failed. Generating a submap export can take several
  // seconds server-side before the response even starts, during which a
  // plain button click otherwise looks like it did nothing.
  const [downloadingExt, setDownloadingExt] =
    useState<SubmapFileExtensions | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const topLeftBoxPosition = map?.getPixelFromCoordinate([
    boxData.top_left_ra,
    boxData.top_left_dec,
  ]);

  const onDownloadClick = useCallback(
    async (ext: SubmapFileExtensions) => {
      if (!submapData) return;
      const boxPosition = transformBoxCoords(boxData, flipped);
      setDownloadError(null);
      setDownloadingExt(ext);
      try {
        await mapApi.downloadSubmap(
          {
            ...submapData,
            top: boxPosition.top_left_dec,
            left: boxPosition.top_left_ra,
            bottom: boxPosition.bottom_right_dec,
            right: boxPosition.bottom_right_ra,
          },
          ext,
          flipped
        );
      } catch (error) {
        console.error('Error downloading the file:', error);
        setDownloadError(
          `Failed to download ${ext.toUpperCase()}. Please try again.`
        );
      } finally {
        setDownloadingExt(null);
      }
    },
    [submapData, boxData, flipped]
  );

  return (
    <div
      className={
        'box-menu-hover-container no-background ' +
        (isNewBox && !showMenuOverlay && 'hide')
      }
      style={{
        top: topLeftBoxPosition ? topLeftBoxPosition[1] : 0,
        left: topLeftBoxPosition ? topLeftBoxPosition[0] : 0,
      }}
    >
      <div className="box-menu-header">
        <button
          className={'map-btn menu-btn'}
          onClick={() => setShowMenu(!showMenu)}
        >
          <MenuIcon />
        </button>
        {showMenu && (
          <div className="box-menu-btns-container">
            {SUBMAP_DOWNLOAD_OPTIONS.map((option) => (
              <button
                className="map-btn menu-btn"
                key={option.display}
                disabled={!submapData || downloadingExt !== null}
                onClick={() => onDownloadClick(option.ext)}
              >
                {downloadingExt === option.ext ? (
                  <>
                    <Spinner size={12} /> Downloading...
                  </>
                ) : (
                  `Download ${option.display}`
                )}
              </button>
            ))}
            {downloadError && (
              <p className="box-menu-download-error">{downloadError}</p>
            )}
            {...additionalButtons}
          </div>
        )}
        {!isNewBox && 'name' in boxData && <h3>{boxData.name}</h3>}
      </div>
      {!isNewBox && 'description' in boxData && <p>{boxData.description}</p>}
    </div>
  );
}
