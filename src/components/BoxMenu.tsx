import { ReactNode } from 'react';
import { BoxWithPositionalData, NewBoxData, SubmapData } from '../types/maps';
import { MenuIcon } from './icons/MenuIcon';
import { SUBMAP_DOWNLOAD_OPTIONS } from '../configs/submapConfigs';
import { downloadSubmap } from '../utils/fetchUtils';

type BoxMenuProps = {
  isNewBox: boolean;
  boxData: BoxWithPositionalData | NewBoxData;
  setShowMenu: (showMenu: boolean) => void;
  showMenu: boolean;
  additionalButtons?: ReactNode[];
  submapData?: SubmapData;
  showMenuOverlay?: boolean;
};

export function BoxMenu({
  isNewBox,
  boxData,
  setShowMenu,
  showMenu,
  additionalButtons = [],
  submapData,
  showMenuOverlay,
}: BoxMenuProps) {
  return (
    <div
      className={
        'highlight-box-hover-container no-background ' +
        (isNewBox && !showMenuOverlay && 'hide')
      }
      style={{
        top: boxData.top,
        left: boxData.left,
      }}
    >
      <div>
        <div className="highlight-box-header">
          <button
            className={'menu-button highlight-box-menu-btn'}
            onClick={() => setShowMenu(!showMenu)}
          >
            <MenuIcon />
          </button>
          {showMenu && (
            <div className="menu-btns-container highlight-box-menu-btns-container">
              {SUBMAP_DOWNLOAD_OPTIONS.map((option) => (
                <button
                  className="area-select-button highlight-box-button"
                  key={option.display}
                  onClick={() => {
                    if (submapData) {
                      downloadSubmap(
                        {
                          ...submapData,
                          top: boxData.top_left_dec,
                          left: boxData.top_left_ra,
                          bottom: boxData.bottom_right_dec,
                          right: boxData.bottom_right_ra,
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
    </div>
  );
}
