import { MouseEvent, useCallback, useRef } from 'react';
import { SourceList } from '../types/maps';
import { makeLayerName } from '../utils/layerUtils';
import { LayersIcon } from './icons/LayersIcon';
import './styles/layer-selector.css';
import { MapProps } from './OpenLayersMap';

interface Props
  extends Omit<
    MapProps,
    | 'baselayerState'
    | 'sourceLists'
    | 'setActiveBoxIds'
    | 'setBoxes'
    | 'addOptimisticHighlightBox'
  > {
  activeBaselayerId?: number;
  sourceLists: SourceList[];
}

export function LayerSelector({
  bands,
  onBaseLayerChange,
  activeBaselayerId,
  sourceLists,
  onSelectedSourceListsChange,
  activeSourceListIds,
  highlightBoxes,
  activeBoxIds,
  onSelectedHighlightBoxChange,
}: Props) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  const toggleMenu = useCallback(
    (e: MouseEvent) => {
      if (!menuRef.current) return;
      const target = (e.target as HTMLElement).closest('div');
      if (target && target.classList.contains('btn')) {
        menuRef.current.classList.remove('hide');
      }
      if (target && target.classList.contains('menu')) {
        menuRef.current.classList.add('hide');
      }
    },
    [menuRef.current]
  );

  return (
    <>
      <div onMouseEnter={toggleMenu} className="layer-selector-container btn">
        <LayersIcon />
      </div>
      <div
        ref={menuRef}
        className={'layer-selector-container menu hide'}
        onMouseLeave={toggleMenu}
      >
        <fieldset>
          <legend>Baselayers</legend>
          {bands.map((band) => (
            <div className="input-container" key={band.map_id + '-' + band.id}>
              <input
                type="radio"
                id={String(band.id)}
                value={band.id}
                name="baselayer"
                checked={band.id === activeBaselayerId}
                onChange={(e) => onBaseLayerChange(Number(e.target.value))}
              />
              <label htmlFor={String(band.id)}>{makeLayerName(band)}</label>
            </div>
          ))}
        </fieldset>
        {sourceLists.length && (
          <fieldset>
            <legend>Source catalogs</legend>
            {sourceLists.map((sl) => (
              <div className="input-container" key={sl.id + '-' + sl.name}>
                <input
                  onChange={onSelectedSourceListsChange}
                  type="checkbox"
                  id={String(sl.id)}
                  value={sl.id}
                  checked={activeSourceListIds.includes(sl.id)}
                />
                <label htmlFor={String(sl.id)}>{sl.name}</label>
              </div>
            ))}
          </fieldset>
        )}
        {highlightBoxes && (
          <fieldset>
            <legend>Highlight regions</legend>
            {highlightBoxes.map((box) => (
              <div className="input-container" key={box.id + '-' + box.name}>
                <input
                  onChange={onSelectedHighlightBoxChange}
                  type="checkbox"
                  id={String(box.id)}
                  value={box.id}
                  checked={activeBoxIds.includes(box.id)}
                />
                <label htmlFor={String(box.id)}>{box.name}</label>
              </div>
            ))}
          </fieldset>
        )}
      </div>
    </>
  );
}
