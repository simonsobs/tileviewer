import { LayersControl, Rectangle, useMap } from 'react-leaflet';
import L, { latLng, latLngBounds } from 'leaflet';
import { Box } from '../types/maps';
import { useCallback, useEffect, useRef, useMemo } from 'react';
import './styles/highlight-controls.css';
import {
  SUBMAP_DOWNLOAD_OPTIONS,
  SubmapData,
  SubmapDataWithBounds,
} from './AreaSelection';
import { deleteSubmapBox, downloadSubmap } from '../utils/fetchUtils';
import { menu } from '../icons/menu';
import { getTopLeftBottomRightFromBounds } from '../utils/layerUtils';

type HighlightBoxLayerProps = {
  box: Box;
  submapData: SubmapData;
  setBoxes: (boxes: Box[]) => void;
  activeBoxIds: number[];
};

interface CustomBoxPaneProps
  extends Omit<HighlightBoxLayerProps, 'activeBoxIds'> {
  hideBoxHandler: () => void;
  bounds: L.LatLngBounds;
}

function generateBoxContent(
  boxId: number,
  container: HTMLDivElement,
  name: string,
  description: string,
  hideBoxHandler: CustomBoxPaneProps['hideBoxHandler'],
  setBoxes: HighlightBoxLayerProps['setBoxes'],
  submapDataWithBounds: SubmapDataWithBounds
) {
  const boxContainer = container.firstChild as HTMLDivElement;

  while (boxContainer.firstChild) {
    boxContainer.removeChild(boxContainer.firstChild);
  }

  const headerDiv = document.createElement('div');
  headerDiv.className = 'highlight-box-header';

  const menuBtnsContainer = document.createElement('div');
  menuBtnsContainer.style.display = 'none';
  menuBtnsContainer.classList.add(
    'menu-btns-container',
    'highlight-box-menu-btns-container'
  );

  const hamburgerMenuButton = document.createElement('button');
  hamburgerMenuButton.className = 'menu-button highlight-box-menu-btn';
  hamburgerMenuButton.innerHTML = menu;
  hamburgerMenuButton.addEventListener('click', () => {
    if (menuBtnsContainer.style.display === 'none') {
      menuBtnsContainer.style.display = 'flex';
    } else {
      menuBtnsContainer.style.display = 'none';
    }
  });

  const boxHeader = document.createElement('h3');
  boxHeader.textContent = name;

  const p = document.createElement('p');
  p.textContent = description;

  const menuBtns = [];
  SUBMAP_DOWNLOAD_OPTIONS.forEach((option) => {
    const btn = document.createElement('button');
    btn.textContent = `Download ${option.display}`;
    btn.classList.add('area-select-button', 'highlight-box-button');
    btn.addEventListener('click', () => {
      if (submapDataWithBounds) {
        downloadSubmap(submapDataWithBounds, option.ext);
      }
    });
    menuBtns.push(btn);
  });

  const hideBoxBtn = document.createElement('button');
  hideBoxBtn.textContent = 'Hide Box';
  hideBoxBtn.classList.add('area-select-button', 'highlight-box-button');
  hideBoxBtn.addEventListener('click', hideBoxHandler);
  menuBtns.push(hideBoxBtn);

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete Box';
  deleteBtn.classList.add(
    'area-select-button',
    'highlight-box-button',
    'delete-box-button'
  );
  deleteBtn.addEventListener('click', () => {
    deleteSubmapBox(boxId, setBoxes);
    container.remove();
  });
  menuBtns.push(deleteBtn);

  menuBtnsContainer.append(...menuBtns);

  headerDiv.append(hamburgerMenuButton, menuBtnsContainer, boxHeader);

  boxContainer.append(headerDiv, p);
}

export function CustomBoxPane({
  box,
  submapData,
  bounds,
  setBoxes,
  hideBoxHandler,
}: CustomBoxPaneProps) {
  const map = useMap();
  const paneName = `highlight-boxes-pane-${box.id}`;

  useEffect(() => {
    if (!map.getPane(paneName)) {
      const pane = map.createPane(paneName);
      pane.style.zIndex = String(500);
      const boxContainer = document.createElement('div');
      boxContainer.className = 'highlight-box-hover-container';
      pane.append(boxContainer);

      pane.addEventListener(
        'mouseover',
        () => (boxContainer.style.display = 'block')
      );

      pane.addEventListener(
        'mouseout',
        () => (boxContainer.style.display = 'none')
      );
    }
  }, [map, paneName]);

  useEffect(() => {
    const pane = map.getPane(paneName);

    const submapDataWithBounds = {
      ...submapData,
      ...getTopLeftBottomRightFromBounds(bounds),
    };

    generateBoxContent(
      box.id,
      pane as HTMLDivElement,
      box.name,
      box.description,
      hideBoxHandler,
      setBoxes,
      submapDataWithBounds
    );
  }, [map, submapData, bounds]);

  return null;
}

export function HighlightBoxLayer({
  box,
  submapData,
  setBoxes,
  activeBoxIds,
}: HighlightBoxLayerProps) {
  const map = useMap();
  const layer = useRef<L.Rectangle | null>(null);

  const hideBoxHandler = useCallback(() => {
    if (layer.current) {
      const pane = map.getPane(`highlight-boxes-pane-${box.id}`);
      if (
        pane &&
        pane.firstChild &&
        pane.firstChild instanceof HTMLDivElement
      ) {
        const boxOverlayContainer = pane.firstChild;
        boxOverlayContainer.style.display = 'none';
        const boxHeaderContainer = boxOverlayContainer.firstChild;
        if (
          boxHeaderContainer &&
          boxHeaderContainer instanceof HTMLDivElement &&
          boxHeaderContainer.children
        ) {
          const menuContainer = boxHeaderContainer
            .children[1] as HTMLDivElement;
          menuContainer.style.display = 'none';
        }
      }
      map.removeLayer(layer.current);
    }
  }, [map, layer]);

  const bounds = useMemo(() => {
    return latLngBounds(
      latLng(box.top_left_dec, box.top_left_ra),
      latLng(box.bottom_right_dec, box.bottom_right_ra)
    );
  }, [box]);

  return (
    <LayersControl.Overlay
      key={box.id}
      name={box.name}
      checked={activeBoxIds.includes(box.id)}
    >
      <CustomBoxPane
        key={`custom-pane-${box.id}`}
        box={box}
        hideBoxHandler={hideBoxHandler}
        setBoxes={setBoxes}
        submapData={submapData}
        bounds={bounds}
      />
      <Rectangle
        key={`rectangle-${box.id}`}
        ref={layer}
        bounds={bounds}
        pathOptions={{
          fill: true,
          fillOpacity: 0,
          weight: 2,
          color: 'black',
          pane: `highlight-boxes-pane-${box.id}`,
        }}
      />
    </LayersControl.Overlay>
  );
}
