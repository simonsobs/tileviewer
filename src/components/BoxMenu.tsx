import { ReactNode } from 'react';
import { BoxWithDimensions, NewBoxData, SubmapData } from '../types/maps';
import { MenuIcon } from './icons/MenuIcon';
import { SUBMAP_DOWNLOAD_OPTIONS } from '../configs/submapConfigs';
import { downloadSubmap } from '../utils/fetchUtils';
import { transformBoxes } from '../utils/layerUtils';
import { Map } from 'ol';

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

  const topLeftBoxPosition = map?.getPixelFromCoordinate([
    boxData.top_left_ra,
    boxData.top_left_dec,
  ]);

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
                disabled={!submapData}
                onClick={() => {
                  if (submapData) {
                    const boxPosition = transformBoxes(
                      {
                        top_left_ra: boxData.top_left_ra,
                        top_left_dec: boxData.top_left_dec,
                        bottom_right_ra: boxData.bottom_right_ra,
                        bottom_right_dec: boxData.bottom_right_dec,
                      },
                      flipped
                    );
                    downloadSubmap(
                      {
                        ...submapData,
                        top: boxPosition.top_left_dec,
                        left: boxPosition.top_left_ra,
                        bottom: boxPosition.bottom_right_dec,
                        right: boxPosition.bottom_right_ra,
                      },
                      option.ext
                    );
                  }
                }}
              >
                Download {option.display}
              </button>
            ))}
            {...additionalButtons}
          </div>
        )}
        {!isNewBox && 'name' in boxData && <h3>{boxData.name}</h3>}
      </div>
      {!isNewBox && 'description' in boxData && <p>{boxData.description}</p>}
    </div>
  );
}
