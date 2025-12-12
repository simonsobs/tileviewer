import { useState, ReactNode, useCallback, memo } from 'react';
import { LayerSelectorProps, NoMatches } from './LayerSelector';
import CollapsibleSection from './CollapsibleSection';
import {
  EXTERNAL_BASELAYERS,
  EXTERNAL_DETAILS_ID,
} from '../configs/mapSettings';
import { getDefaultExpandedState, filterMapGroups } from '../utils/filterUtils';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

type BaselayerSectionsProps = {
  mapGroups: LayerSelectorProps['mapGroups'];
  activeBaselayerId: LayerSelectorProps['activeBaselayerId'];
  isFlipped: LayerSelectorProps['isFlipped'];
  onBaselayerChange: LayerSelectorProps['onBaselayerChange'];
  searchText: string;
  markMatchingSearchText: (
    label: string,
    shouldHighlight?: boolean
  ) => string | ReactNode;
};

function BaselayerSections({
  mapGroups,
  activeBaselayerId,
  isFlipped,
  onBaselayerChange,
  searchText,
  markMatchingSearchText,
}: BaselayerSectionsProps) {
  const [expandedState, setExpandedState] = useState<Set<string>>(
    getDefaultExpandedState(mapGroups, activeBaselayerId)
  );
  const { filteredMapGroups, matchedIds } = filterMapGroups(
    mapGroups,
    searchText
  );
  const filteredExternalLayers = EXTERNAL_BASELAYERS.filter((bl) =>
    bl.name.toLowerCase().includes(searchText.toLowerCase())
  );
  const isEmpty =
    filteredMapGroups.length + filteredExternalLayers.length === 0;

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

  if (isEmpty) {
    return <NoMatches />;
  }

  return (
    <>
      {filteredMapGroups.map((group) => (
        <CollapsibleSection
          key={group.name}
          node={group}
          nestedDepth={0}
          onBaselayerChange={onBaselayerChange}
          activeBaselayerId={activeBaselayerId}
          searchText={searchText}
          expandedState={expandedState}
          markMatchingSearchText={markMatchingSearchText}
          matchedIds={matchedIds}
          highlightMatch={matchedIds.has(group.name)}
          handleToggle={handleToggle}
        />
      ))}
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
                  onChange={() => onBaselayerChange(bl.layer_id, 'layerMenu')}
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

export default memo(BaselayerSections);
