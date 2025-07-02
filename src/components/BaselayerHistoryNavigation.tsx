import { LeftArrowIcon } from './icons/LeftArrowIcon';
import { RightArrowIcon } from './icons/RightArrowIcon';

export function BaselayerHistoryNavigation({
  disableGoBack,
  disableGoForward,
  goBack,
  goForward,
}: {
  disableGoBack: boolean;
  disableGoForward: boolean;
  goBack: () => void;
  goForward: () => void;
}) {
  return (
    <>
      <div className="bl-nav-btn-container back-btn-container">
        <button
          type="button"
          className="map-btn"
          title="Go back one baselayer"
          disabled={disableGoBack}
          onClick={goBack}
        >
          <LeftArrowIcon />
        </button>
      </div>
      <div className="bl-nav-btn-container fwd-btn-container">
        <button
          type="button"
          className="map-btn"
          title="Go forward one baselayer"
          disabled={disableGoForward}
          onClick={goForward}
        >
          <RightArrowIcon />
        </button>
      </div>
    </>
  );
}
