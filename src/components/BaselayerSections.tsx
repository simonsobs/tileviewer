import { LayerSelectorProps } from './LayerSelector';
import { CollapsibleSection } from './CollapsibleSection';
import { makeLayerName } from '../utils/layerUtils';
import { EXTERNAL_BASELAYERS } from '../configs/mapSettings';

type BaselayerSectionsProps = {
  internalBaselayerMaps: LayerSelectorProps['internalBaselayerMaps'];
  activeBaselayerId: LayerSelectorProps['activeBaselayerId'];
  isFlipped: LayerSelectorProps['isFlipped'];
  onBaselayerChange: LayerSelectorProps['onBaselayerChange'];
};

export function BaselayerSections({
  internalBaselayerMaps,
  activeBaselayerId,
  isFlipped,
  onBaselayerChange,
}: BaselayerSectionsProps) {
  return (
    <>
      {internalBaselayerMaps?.map((map, index) => (
        <CollapsibleSection
          key={'section-internal-map-' + map.id}
          summary={map.name}
          defaultOpen={index === 0}
        >
          {map.bands.map((band) => (
            <div className="input-container" key={band.map_id + '-' + band.id}>
              <input
                type="radio"
                id={String(band.id)}
                value={band.id}
                name="baselayer"
                checked={band.id === activeBaselayerId}
                onChange={() =>
                  onBaselayerChange(
                    String(band.id),
                    String(band.map_id),
                    'layerMenu'
                  )
                }
              />
              <label htmlFor={String(band.id)}>{makeLayerName(band)}</label>
            </div>
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
              key={bl.id}
              title={
                bl.disabledState(isFlipped)
                  ? 'The current RA range is incompatible with this baselayer.'
                  : undefined
              }
            >
              <input
                type="radio"
                id={bl.id}
                value={bl.id}
                name="baselayer"
                checked={bl.id === activeBaselayerId}
                onChange={() =>
                  onBaselayerChange(bl.id, undefined, 'layerMenu')
                }
                disabled={bl.disabledState(isFlipped)}
              />
              <label htmlFor={bl.id}>{bl.name}</label>
            </div>
          ))}
        </CollapsibleSection>
      }
    </>
  );
}
