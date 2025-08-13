import { LayerSelectorProps } from './LayerSelector';
import { CollapsibleSection } from './CollapsibleSection';
import { EXTERNAL_BASELAYERS } from '../configs/mapSettings';

type BaselayerSectionsProps = {
  mapGroups: LayerSelectorProps['mapGroups'];
  activeBaselayerId: LayerSelectorProps['activeBaselayerId'];
  isFlipped: LayerSelectorProps['isFlipped'];
  onBaselayerChange: LayerSelectorProps['onBaselayerChange'];
};

export function BaselayerSections({
  mapGroups,
  activeBaselayerId,
  isFlipped,
  onBaselayerChange,
}: BaselayerSectionsProps) {
  return (
    <>
      {mapGroups.map((group, groupIndex) => (
        <CollapsibleSection
          key={'section-internal-mapGroup-' + groupIndex}
          summary={group.name}
          defaultOpen={groupIndex === 0}
          tooltip={group.description}
        >
          {group.maps.map((map, mapIndex) => (
            <CollapsibleSection
              key={
                'section-internal-mapGroup-' + groupIndex + '-map-' + map.map_id
              }
              summary={map.name}
              defaultOpen={mapIndex === 0}
              tooltip={map.description}
              nestedDepth={1}
            >
              {map.bands.map((band, bandIndex) => (
                <CollapsibleSection
                  key={
                    'section-internal-mapGroup-' +
                    groupIndex +
                    '-map-' +
                    map.map_id +
                    '-band-' +
                    band.band_id
                  }
                  summary={band.name}
                  defaultOpen={bandIndex === 0}
                  tooltip={band.description}
                  nestedDepth={2}
                >
                  {band.layers.map((layer) => (
                    <div className="input-container" key={layer.layer_id}>
                      <input
                        type="radio"
                        id={String(layer.layer_id)}
                        value={layer.layer_id}
                        name="baselayer"
                        checked={layer.layer_id === activeBaselayerId}
                        onChange={() =>
                          onBaselayerChange(String(layer.layer_id), 'layerMenu')
                        }
                      />
                      <label htmlFor={String(layer.layer_id)}>
                        {layer.name}
                      </label>
                    </div>
                  ))}
                </CollapsibleSection>
              ))}
            </CollapsibleSection>
          ))}
        </CollapsibleSection>
      ))}
      {
        <CollapsibleSection
          key="section-comparison-maps"
          summary="Comparison maps"
          defaultOpen={true}
        >
          {EXTERNAL_BASELAYERS.map((bl) => (
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
              <label htmlFor={bl.layer_id}>{bl.name}</label>
            </div>
          ))}
        </CollapsibleSection>
      }
    </>
  );
}
