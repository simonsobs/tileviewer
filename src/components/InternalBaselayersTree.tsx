import { ReactNode } from 'react';
import type {
  MapGroupMenuState,
  MapMenuState,
  BandMenuState,
  InternalBaselayer,
} from '../types/layers';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { Spinner } from './LoadingOverlay';

type BaseMenuNode = {
  selectedBaselayerId: string | undefined;
  onBaselayerChange: (
    id: string,
    context: 'layerMenu' | 'goBack' | 'goForward',
    flipped: boolean | undefined,
    mergeSearchSelection?: (newActiveBaselayer: InternalBaselayer) => void
  ) => void;
  mergeSearchSelection:
    | undefined
    | ((selectedLayer: InternalBaselayer) => Promise<void>);
  markMatchingSearchText: (
    label: string,
    shouldHighlight?: boolean
  ) => string | ReactNode;
  matchedIds: Set<string> | undefined;
  expandedIds: Record<string, true>;
};

type LayerTreeProps = BaseMenuNode & {
  mapGroups: MapGroupMenuState[];
  onExpandGroup: (groupId: string) => Promise<void>;
  onExpandMap: (groupId: string, mapId: string) => Promise<void>;
  onExpandBand: (
    groupId: string,
    mapId: string,
    bandId: string
  ) => Promise<void>;
};

type GroupNodeProps = BaseMenuNode & {
  group: MapGroupMenuState;
  onExpand: () => void;
  onExpandMap: (mapId: string) => Promise<void>;
  onExpandBand: (mapId: string, bandId: string) => Promise<void>;
};

type MapNodeProps = BaseMenuNode & {
  map: MapMenuState;
  onExpand: () => void;
  onExpandBand: (bandId: string) => Promise<void>;
};

type BandNodeProps = BaseMenuNode & {
  band: BandMenuState;
  onExpand: () => Promise<void>;
};

export function InternalBaselayersTree({
  mapGroups,
  selectedBaselayerId,
  onExpandGroup,
  onExpandMap,
  onExpandBand,
  onBaselayerChange,
  mergeSearchSelection,
  markMatchingSearchText,
  matchedIds,
  expandedIds,
}: LayerTreeProps) {
  if (mapGroups.length === 0) {
    return null;
  }

  return (
    <>
      {mapGroups.map((group) => (
        <GroupNode
          key={group.map_group_id}
          group={group}
          selectedBaselayerId={selectedBaselayerId}
          onExpand={() => onExpandGroup(group.map_group_id)}
          onExpandMap={(mapId: string) =>
            onExpandMap(group.map_group_id, mapId)
          }
          onExpandBand={(mapId: string, bandId: string) =>
            onExpandBand(group.map_group_id, mapId, bandId)
          }
          onBaselayerChange={onBaselayerChange}
          mergeSearchSelection={mergeSearchSelection}
          markMatchingSearchText={markMatchingSearchText}
          matchedIds={matchedIds}
          expandedIds={expandedIds}
        />
      ))}
    </>
  );
}

function GroupNode({
  group,
  selectedBaselayerId,
  onExpand,
  onExpandMap,
  onExpandBand,
  onBaselayerChange,
  mergeSearchSelection,
  markMatchingSearchText,
  matchedIds,
  expandedIds,
}: GroupNodeProps) {
  const isExpanded = expandedIds[group.map_group_id];
  return (
    <div>
      <div className="layer-title-container" onClick={onExpand}>
        {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
        {markMatchingSearchText(
          group.name,
          matchedIds?.has(group.map_group_id)
        )}
      </div>
      {group.maps.status === 'loading' && <LayerMenuSpinner />}
      {group.maps.status === 'error' && (
        <ErrorNote message={group.maps.message} />
      )}
      {group.maps.status === 'loaded' && isExpanded && (
        <>
          {group.maps.data.map((map) => (
            <MapNode
              key={map.map_id}
              map={map}
              selectedBaselayerId={selectedBaselayerId}
              onExpand={() => onExpandMap(map.map_id)}
              onExpandBand={(bandId) => onExpandBand(map.map_id, bandId)}
              onBaselayerChange={onBaselayerChange}
              mergeSearchSelection={mergeSearchSelection}
              markMatchingSearchText={markMatchingSearchText}
              matchedIds={matchedIds}
              expandedIds={expandedIds}
            />
          ))}
        </>
      )}
    </div>
  );
}

function MapNode({
  map,
  selectedBaselayerId,
  onExpand,
  onExpandBand,
  onBaselayerChange,
  mergeSearchSelection,
  markMatchingSearchText,
  matchedIds,
  expandedIds,
}: MapNodeProps) {
  const isExpanded = expandedIds[map.map_id];
  return (
    <div className="map-level-offset">
      <div className="layer-title-container" onClick={onExpand}>
        {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
        {markMatchingSearchText(map.name, matchedIds?.has(map.map_id))}
      </div>
      {map.bands.status === 'loading' && <LayerMenuSpinner />}
      {map.bands.status === 'loaded' && isExpanded && (
        <>
          {map.bands.data.map((band) => (
            <BandNode
              key={band.band_id}
              band={band}
              selectedBaselayerId={selectedBaselayerId}
              onExpand={() => onExpandBand(band.band_id)}
              onBaselayerChange={onBaselayerChange}
              mergeSearchSelection={mergeSearchSelection}
              markMatchingSearchText={markMatchingSearchText}
              matchedIds={matchedIds}
              expandedIds={expandedIds}
            />
          ))}
        </>
      )}
    </div>
  );
}

function BandNode({
  band,
  selectedBaselayerId,
  onExpand,
  onBaselayerChange,
  mergeSearchSelection,
  markMatchingSearchText,
  matchedIds,
  expandedIds,
}: BandNodeProps) {
  const isExpanded = expandedIds[band.band_id];
  return (
    <div className="band-level-offset">
      <div className="layer-title-container" onClick={onExpand}>
        {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
        {markMatchingSearchText(band.name, matchedIds?.has(band.band_id))}
      </div>
      {band.layers.status === 'loading' && <LayerMenuSpinner />}
      {band.layers.status === 'loaded' && isExpanded && (
        <div className="layer-inputs-container">
          {band.layers.data.map((layer) => (
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
                checked={layer.layer_id === selectedBaselayerId}
                onChange={() =>
                  onBaselayerChange(
                    String(layer.layer_id),
                    'layerMenu',
                    undefined,
                    mergeSearchSelection
                  )
                }
              />
              {markMatchingSearchText(
                layer.name,
                matchedIds?.has(layer.layer_id)
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function LayerMenuSpinner() {
  return (
    <div className="layer-menu-spinner">
      <Spinner />
    </div>
  );
}

function ErrorNote({ message }: { message?: string }) {
  return <div>{message ?? 'Failed to load'}</div>;
}
