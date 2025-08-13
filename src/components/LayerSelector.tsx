import { MouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import { SourceList } from '../types/maps';
import { LayersIcon } from './icons/LayersIcon';
import './styles/layer-selector.css';
import { MapProps } from './OpenLayersMap';
import {
  BaselayerHistoryNavigation,
  BaselayerHistoryNavigationProps,
} from './BaselayerHistoryNavigation';
import { LockClosedIcon } from './icons/LockClosedIcon';
import { LockOpenIcon } from './icons/LockOpenIcon';
import { BaselayerSections } from './BaselayerSections';

export interface LayerSelectorProps
  extends Omit<
    MapProps & BaselayerHistoryNavigationProps,
    | 'baselayersState'
    | 'sourceLists'
    | 'setActiveBoxIds'
    | 'setBoxes'
    | 'addOptimisticHighlightBox'
    | 'dispatchBaselayersChange'
    | 'isLogScale'
  > {
  onBaselayerChange: (
    selectedBaselayerId: string,
    context: 'layerMenu' | 'goBack' | 'goForward',
    flipped?: boolean
  ) => void;
  activeBaselayerId?: number | string;
  sourceLists: SourceList[];
  isFlipped: boolean;
}

export function LayerSelector({
  mapGroups,
  onBaselayerChange,
  activeBaselayerId,
  sourceLists,
  onSelectedSourceListsChange,
  activeSourceListIds,
  highlightBoxes,
  activeBoxIds,
  onSelectedHighlightBoxChange,
  isFlipped,
  disableGoBack,
  disableGoForward,
  goBack,
  goForward,
}: LayerSelectorProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [lockMenu, setLockMenu] = useState(false);
  const previousLockMenuHandlerRef = useRef<(e: KeyboardEvent) => void>(null);

  useEffect(() => {
    if (previousLockMenuHandlerRef.current) {
      document.removeEventListener(
        'keypress',
        previousLockMenuHandlerRef.current
      );
    }

    // Create new handler
    const newHandler = (e: KeyboardEvent) => {
      // Return early if target is in an input
      if ((e.target as HTMLElement)?.closest('input')) {
        return;
      }
      if (e.key === 'm') {
        setLockMenu(!lockMenu);
        if (menuRef.current?.classList.contains('hide')) {
          menuRef.current.classList.remove('hide');
        } else {
          if (lockMenu) {
            menuRef.current?.classList.add('hide');
          }
        }
      }
    };

    // Add new handler and update the ref
    document.addEventListener('keypress', newHandler);
    previousLockMenuHandlerRef.current = newHandler;

    // Remove handler when component unmounts
    return () =>
      document.removeEventListener(
        'keypress',
        previousLockMenuHandlerRef.current ?? newHandler
      );
  }, [setLockMenu, lockMenu, menuRef.current]);

  const toggleMenu = useCallback(
    (e: MouseEvent) => {
      if (!menuRef.current || lockMenu) return;
      const target = (e.target as HTMLElement).closest('div');
      if (target && target.classList.contains('btn')) {
        menuRef.current.classList.remove('hide');
      }
      if (target && target.classList.contains('menu')) {
        menuRef.current.classList.add('hide');
      }
    },
    [menuRef.current, lockMenu]
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
        <div className="layer-selector-header">
          <h3>Select Layer</h3>
          <button
            className={'lock-menu-btn' + (lockMenu ? ' locked' : '')}
            onClick={() => setLockMenu(!lockMenu)}
            title="Type 'm' or click to lock/unlock the layer menu."
          >
            {lockMenu ? <LockClosedIcon /> : <LockOpenIcon />}
          </button>
          <BaselayerHistoryNavigation
            disableGoBack={disableGoBack}
            disableGoForward={disableGoForward}
            goBack={goBack}
            goForward={goForward}
          />
        </div>
        <fieldset>
          <legend>Baselayers</legend>
          <BaselayerSections
            mapGroups={mapGroups}
            activeBaselayerId={activeBaselayerId}
            isFlipped={isFlipped}
            onBaselayerChange={onBaselayerChange}
          />
        </fieldset>
        {sourceLists.length ? (
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
        ) : null}
        {highlightBoxes && highlightBoxes.length ? (
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
        ) : null}
      </div>
    </>
  );
}
