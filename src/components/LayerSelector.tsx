import { MouseEvent, useCallback, useRef } from 'react';
import { Band, SourceList } from '../types/maps';
import { makeLayerName } from '../utils/layerUtils';
import { LayersIcon } from './icons/LayersIcon';
import './styles/layer-selector.css';

type Props = {
  bands: Band[];
  activeBaselayerId?: number;
  onBaseLayerChange: (baselayerId: number) => void;
  sourceLists: SourceList[];
};
export function LayerSelector({
  bands,
  onBaseLayerChange,
  activeBaselayerId,
  sourceLists,
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
            <div className="input-container">
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
              <div className="input-container">
                <input type="checkbox" id={String(sl.id)} value={sl.id} />
                <label htmlFor={String(sl.id)}>{sl.name}</label>
              </div>
            ))}
          </fieldset>
        )}
      </div>
    </>
  );
}
