import { useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { LayerSelectorProps, NoMatches } from './LayerSelector';
import { CollapsibleSection } from './CollapsibleSection';
import {
  EXTERNAL_BASELAYERS,
  EXTERNAL_DETAILS_ID,
} from '../configs/mapSettings';
import { getDefaultExpandedState, filterMapGroups } from '../utils/filterUtils';

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

export function BaselayerSections({
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
  const externalDetailsRef = useRef<HTMLDetailsElement>(null);

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

  useEffect(() => {
    if (!externalDetailsRef.current) return;
    if (searchText.length > 0) {
      externalDetailsRef.current.open = true;
    } else {
      externalDetailsRef.current.open = expandedState.has(EXTERNAL_DETAILS_ID);
    }
  }, [searchText, externalDetailsRef, expandedState]);

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
        <details ref={externalDetailsRef} onToggle={(e) => e.preventDefault()}>
          <summary
            title="External maps used for comparison"
            onClick={() => handleToggle(EXTERNAL_DETAILS_ID)}
          >
            Comparison maps
          </summary>
          {filteredExternalLayers.map((bl) => (
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
                className="layer-selector-input-label"
              >
                {markMatchingSearchText(bl.name)}
              </label>
            </div>
          ))}
        </details>
      )}
    </>
  );
}
