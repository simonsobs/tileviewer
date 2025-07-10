import { LeftArrowIcon } from './icons/LeftArrowIcon';
import { RightArrowIcon } from './icons/RightArrowIcon';

export type BaselayerHistoryNavigationProps = {
  disableGoBack: boolean;
  disableGoForward: boolean;
  goBack: () => void;
  goForward: () => void;
};

export function BaselayerHistoryNavigation({
  disableGoBack,
  disableGoForward,
  goBack,
  goForward,
}: BaselayerHistoryNavigationProps) {
  return (
    <>
      <div>
        <button
          type="button"
          className="map-btn"
          title="Type 'H' or click to go back one baselayer"
          disabled={disableGoBack}
          onClick={goBack}
        >
          <LeftArrowIcon />
        </button>
      </div>
      <div>
        <button
          type="button"
          className="map-btn"
          title="Type 'L' or click to go forward one baselayer"
          disabled={disableGoForward}
          onClick={goForward}
        >
          <RightArrowIcon />
        </button>
      </div>
    </>
  );
}
