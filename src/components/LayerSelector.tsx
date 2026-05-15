import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { LayersIcon } from './icons/LayersIcon';
import './styles/layer-selector.css';
import { BaselayerHistoryNavigation } from './BaselayerHistoryNavigation';
import { LockClosedIcon } from './icons/LockClosedIcon';
import { LockOpenIcon } from './icons/LockOpenIcon';
import { getCatalogMarkerColor } from '../utils/layerUtils';
import { useLayerMenu } from '../hooks/useLayerMenu';
import { InternalBaselayersTree } from './InternalBaselayersTree';
import {
  DefaultData,
  ExternalBaselayer,
  InternalBaselayer,
} from '../types/layers';
import { mapApi } from '../api/client';
import ExternalBaselayersSection from './ExternalBaselayersSection';
import { OverlayData } from '../hooks/useOverlayData';
import { BaselayerChangeHook } from '../hooks/useBaselayerChange';

export interface LayerSelectorProps
  extends Omit<OverlayData, 'setActiveBoxIds'> {
  defaultData: DefaultData;
  selectedBaselayerId?: string;
  activeBaselayer?: InternalBaselayer | ExternalBaselayer;
  isFlipped: boolean;
  onBaselayerChange: BaselayerChangeHook['changeBaselayer'];
  goBack: BaselayerChangeHook['goBack'];
  goForward: BaselayerChangeHook['goForward'];
  disableGoBack: BaselayerChangeHook['disableGoBack'];
  disableGoForward: BaselayerChangeHook['disableGoForward'];
}

export function LayerSelector({
  defaultData,
  onBaselayerChange,
  selectedBaselayerId,
  sourceGroups = [],
  onSelectedSourceGroupsChange,
  activeSourceGroupIds,
  // areSourceGroupsLoading,
  highlightBoxes = [],
  activeBoxIds,
  onSelectedHighlightBoxChange,
  // areHighlightBoxesLoading,
  isFlipped,
  disableGoBack,
  disableGoForward,
  goBack,
  goForward,
}: LayerSelectorProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [lockMenu, setLockMenu] = useState(false);
  const previousLockMenuHandlerRef = useRef<(e: KeyboardEvent) => void>(null);
  const [tempSearchText, setTempSearchText] = useState('');
  const [searchText, setSearchText] = useState('');

  const {
    state,
    expandGroup,
    expandMap,
    expandBand,
    setSearchState,
    mergeSearchSelection,
  } = useLayerMenu(defaultData);

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
  }, [setLockMenu, lockMenu, menuRef]);

  const showMenu = useCallback(() => {
    if (!menuRef.current || lockMenu) return;
    menuRef.current.classList.remove('hide');
  }, [lockMenu]);

  const hideMenu = useCallback(() => {
    if (!menuRef.current || lockMenu) return;
    menuRef.current.classList.add('hide');
  }, [lockMenu]);

  const handleFilterChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setTempSearchText(e.target.value);
  }, []);

  const handleFilterKeyUp = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        setTempSearchText('');
        setSearchText('');
        setSearchState(undefined);
      }
    },
    [setSearchState]
  );

  const handleFilterSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const formData = new FormData(e.target as HTMLFormElement);
      const val = String(formData.get('filter_input'));
      if (val.length && val !== searchText) {
        setSearchText(val);
        const res = await mapApi.getFilteredMenu(val);
        setSearchState({
          filtered_layer_menu: res.filtered_layer_menu,
          matched_ids: res.matched_ids,
        });
      }
      if (searchText.length && !val.length) {
        setSearchText('');
        setSearchState(undefined);
      }
    },
    [searchText, setSearchState]
  );

  const markMatchingSearchText = useCallback(
    (label: string, shouldHighlight?: boolean) => {
      if (
        !searchText.length ||
        (shouldHighlight !== undefined && !shouldHighlight)
      )
        return label;

      const substringStartIndex = label
        .toLowerCase()
        .indexOf(searchText.toLowerCase());
      if (substringStartIndex === -1) return label;
      const substringStopIndex = substringStartIndex + searchText.length;

      const preMarkedSubstring = label.slice(0, substringStartIndex);
      const markedSubstring = label.slice(
        substringStartIndex,
        substringStopIndex
      );
      const postMarkedSubstring = label.slice(substringStopIndex);

      return (
        <>
          {preMarkedSubstring}
          <mark>{markedSubstring}</mark>
          {postMarkedSubstring}
        </>
      );
    },
    [searchText]
  );

  const filteredSourceGroups = sourceGroups.filter((sourceGroup) =>
    sourceGroup.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const filteredHighlightBoxes = highlightBoxes.filter((box) =>
    box.name.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <>
      <div onMouseEnter={showMenu} className="layer-selector-container btn">
        <LayersIcon />
      </div>
      <div
        ref={menuRef}
        className={'layer-selector-container menu hide'}
        onMouseLeave={hideMenu}
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
        <div className="layer-filter-container">
          <form onSubmit={handleFilterSubmit}>
            <input
              name="filter_input"
              id="layer-filter-input"
              type="text"
              placeholder="Filter layers..."
              value={tempSearchText}
              onChange={handleFilterChange}
              onKeyUp={handleFilterKeyUp}
            />
          </form>
        </div>
        <div className="layers-fieldset-container">
          <fieldset>
            <legend>Baselayers</legend>
            <InternalBaselayersTree
              mapGroups={
                state.search && searchText
                  ? state.search.groups
                  : state.mapGroups
              }
              selectedBaselayerId={selectedBaselayerId}
              onExpandGroup={expandGroup}
              onExpandMap={expandMap}
              onExpandBand={expandBand}
              onBaselayerChange={onBaselayerChange}
              mergeSearchSelection={
                state.search ? mergeSearchSelection : undefined
              }
              markMatchingSearchText={markMatchingSearchText}
              matchedIds={state.search?.matchedIds}
              expandedIds={
                state.search ? state.search.expandedIds : state.expandedIds
              }
            />
            <ExternalBaselayersSection
              internalSearchLength={
                state.search ? state.search.groups.length : undefined
              }
              activeBaselayerId={selectedBaselayerId}
              isFlipped={isFlipped}
              onBaselayerChange={onBaselayerChange}
              searchText={searchText}
              markMatchingSearchText={markMatchingSearchText}
            />
          </fieldset>
          {/** Only render this section if source groups are returned by server */}
          {sourceGroups.length ? (
            <fieldset>
              <legend>Source catalogs</legend>
              {filteredSourceGroups.length ? (
                filteredSourceGroups.map((sourceGroup) => (
                  <div
                    className="input-container"
                    key={sourceGroup.source_group_id + '-' + sourceGroup.name}
                  >
                    <input
                      className="source-group-input"
                      style={{
                        outlineColor: getCatalogMarkerColor(
                          sourceGroup.clientId
                        ),
                      }}
                      onChange={onSelectedSourceGroupsChange}
                      type="checkbox"
                      id={String(sourceGroup.source_group_id)}
                      value={sourceGroup.source_group_id}
                      checked={activeSourceGroupIds.includes(
                        sourceGroup.source_group_id
                      )}
                    />
                    <label
                      className="layer-selector-input-label"
                      htmlFor={String(sourceGroup.source_group_id)}
                    >
                      {markMatchingSearchText(sourceGroup.name)}
                    </label>
                  </div>
                ))
              ) : (
                <NoMatches />
              )}
            </fieldset>
          ) : null}
          {/** Only render this section if highlight boxes are returned by server */}
          {highlightBoxes.length ? (
            <fieldset>
              <legend>Highlight regions</legend>
              {filteredHighlightBoxes.length ? (
                filteredHighlightBoxes.map((box) => (
                  <div
                    className="input-container"
                    key={box.id + '-' + box.name}
                  >
                    <input
                      onChange={onSelectedHighlightBoxChange}
                      type="checkbox"
                      id={String(box.id)}
                      value={box.id}
                      checked={activeBoxIds.includes(box.id)}
                    />
                    <label
                      className="layer-selector-input-label"
                      htmlFor={String(box.id)}
                    >
                      {markMatchingSearchText(box.name)}
                    </label>
                  </div>
                ))
              ) : (
                <NoMatches />
              )}
            </fieldset>
          ) : null}
        </div>
      </div>
    </>
  );
}

export function NoMatches() {
  return (
    <span>
      <em>No matches</em>
    </span>
  );
}
