import { ReactNode, useRef, useEffect } from 'react';
import { LayerSelectorProps } from './LayerSelector';
import {
  BandResponse,
  LayerResponse,
  MapGroupResponse,
  MapResponse,
} from '../types/maps';
import { getNodeId } from '../utils/filterUtils';

type Props = {
  node: MapGroupResponse | MapResponse | BandResponse | LayerResponse;
  nestedDepth: number;
  onBaselayerChange: LayerSelectorProps['onBaselayerChange'];
  activeBaselayerId: LayerSelectorProps['activeBaselayerId'];
  searchText: string;
  expandedState: Set<string>;
  markMatchingSearchText: (
    label: string,
    shouldHighlight?: boolean
  ) => string | ReactNode;
  matchedIds: Set<string>;
  highlightMatch: boolean;
  handleToggle: (id: string) => void;
};

export function CollapsibleSection({
  node,
  nestedDepth,
  onBaselayerChange,
  activeBaselayerId,
  searchText,
  expandedState,
  markMatchingSearchText,
  matchedIds,
  highlightMatch,
  handleToggle,
}: Props) {
  let children;
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (!detailsRef.current) return;
    if (searchText.length > 0) {
      detailsRef.current.open = true;
    } else {
      detailsRef.current.open = expandedState.has(getNodeId(node));
    }
  }, [searchText, detailsRef, expandedState, node]);

  if ('band_id' in node) {
    children = (node as BandResponse).layers.map((layer) => (
      <label
        key={'baselayer-label-' + layer.layer_id}
        className="layer-selector-input-label"
      >
        <input
          key={'baselayer-input-' + layer.layer_id}
          type="radio"
          id={String(layer.layer_id)}
          value={layer.layer_id}
          name="baselayer"
          checked={layer.layer_id === activeBaselayerId}
          onChange={() =>
            onBaselayerChange(String(layer.layer_id), 'layerMenu')
          }
        />
        {markMatchingSearchText(layer.name, matchedIds.has(layer.layer_id))}
      </label>
    ));
  } else if ('map_id' in node) {
    children = (node as MapResponse).bands.map((band) => (
      <CollapsibleSection
        key={band.band_id}
        node={band}
        nestedDepth={nestedDepth + 1}
        onBaselayerChange={onBaselayerChange}
        activeBaselayerId={activeBaselayerId}
        searchText={searchText}
        expandedState={expandedState}
        markMatchingSearchText={markMatchingSearchText}
        matchedIds={matchedIds}
        highlightMatch={matchedIds.has(band.band_id)}
        handleToggle={handleToggle}
      />
    ));
  } else {
    children = (node as MapGroupResponse).maps.map((map) => (
      <CollapsibleSection
        key={map.map_id}
        node={map}
        nestedDepth={nestedDepth + 1}
        onBaselayerChange={onBaselayerChange}
        activeBaselayerId={activeBaselayerId}
        searchText={searchText}
        expandedState={expandedState}
        markMatchingSearchText={markMatchingSearchText}
        matchedIds={matchedIds}
        highlightMatch={matchedIds.has(map.map_id)}
        handleToggle={handleToggle}
      />
    ));
  }

  return (
    <details
      ref={detailsRef}
      style={{ marginLeft: nestedDepth * 5 }}
      onToggle={(e) => e.preventDefault()}
    >
      <summary title={node.description} onClick={() => getNodeId(node)}>
        {markMatchingSearchText(node.name, highlightMatch)}
      </summary>
      {children}
    </details>
  );
}
