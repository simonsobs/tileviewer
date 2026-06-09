import { useState, ReactNode, useCallback, memo } from 'react';
import { LayerSelectorProps, NoMatches } from './LayerSelector';
import {
  EXTERNAL_BASELAYERS,
  EXTERNAL_DETAILS_ID,
} from '../configs/mapConfigs';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

type ExternalBaselayersSectionProps = {
  internalSearchLength: number | undefined;
  activeBaselayerId: LayerSelectorProps['selectedBaselayerId'];
  isFlipped: LayerSelectorProps['isFlipped'];
  onBaselayerChange: LayerSelectorProps['onBaselayerChange'];
  searchText: string;
  markMatchingSearchText: (
    label: string,
    shouldHighlight?: boolean
  ) => string | ReactNode;
};

function ExternalBaselayersSection({
  internalSearchLength,
  activeBaselayerId,
  isFlipped,
  onBaselayerChange,
  searchText,
  markMatchingSearchText,
}: ExternalBaselayersSectionProps) {
  const [expandedState, setExpandedState] = useState<Set<string>>(
    new Set([EXTERNAL_DETAILS_ID])
  );
  const filteredExternalLayers = EXTERNAL_BASELAYERS.filter((bl) =>
    bl.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleToggle = useCallback(
    (id: string) => {
      if (expandedState.has(id)) {
        setExpandedState((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        setExpandedState((prev) => new Set(prev).add(id));
      }
    },
    [expandedState]
  );

  if (internalSearchLength === 0 && filteredExternalLayers.length === 0) {
    return <NoMatches />;
  }

  return (
    <>
      {filteredExternalLayers.length > 0 && (
        <div>
          <div
            title="External maps used for comparison"
            onClick={() => handleToggle(EXTERNAL_DETAILS_ID)}
            className="layer-title-container"
          >
            {expandedState.has(EXTERNAL_DETAILS_ID) ? (
              <ChevronDownIcon />
            ) : (
              <ChevronRightIcon />
            )}
            Comparison maps
          </div>
          {expandedState.has(EXTERNAL_DETAILS_ID) &&
            filteredExternalLayers.map((bl) => (
              <div
                className={`input-container ${bl.disabledState(isFlipped) ? 'disabled' : ''}`}
                key={bl.layer_id}
                title={
                  bl.disabledState(isFlipped)
                    ? 'The current RA range is incompatible with this baselayer.'
                    : undefined
                }
              >
                <input
                  type="radio"
                  id={bl.layer_id}
                  value={bl.layer_id}
                  name="baselayer"
                  checked={bl.layer_id === activeBaselayerId}
                  onChange={() =>
                    onBaselayerChange(
                      bl.layer_id,
                      'layerMenu',
                      undefined,
                      undefined
                    )
                  }
                  disabled={bl.disabledState(isFlipped)}
                />
                <label
                  htmlFor={bl.layer_id}
                  className="external-layer-selector-input-label"
                >
                  {markMatchingSearchText(bl.name)}
                </label>
              </div>
            ))}
        </div>
      )}
    </>
  );
}

export default memo(ExternalBaselayersSection);
