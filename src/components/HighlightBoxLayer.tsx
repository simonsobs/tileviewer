import { LayersControl, Rectangle, useMap } from "react-leaflet"
import L, { latLng, latLngBounds } from "leaflet"
import { Box } from "../types/maps"
import { useCallback, useEffect, useMemo, useRef } from "react"
import './styles/highlight-controls.css'
import { SERVICE_URL } from "../configs/mapSettings"
import { SUBMAP_DOWNLOAD_OPTIONS, SubmapData, SubmapDataWithBounds } from "./AreaSelection"
import { downloadSubmap } from "../utils/fetchUtils"
import { menu } from "../icons/menu"
import { getTopLeftBottomRightFromBounds } from "../utils/layerUtils"

type HighlightBoxLayerProps = {
    box: Box;
    submapData?: SubmapData;
}

function generateBoxContent(
    boxId: number,
    container: HTMLDivElement,
    name: string,
    description: string,
    panePosition: CustomBoxPaneProps['panePosition'],
    hideBoxHandler: CustomBoxPaneProps['hideBoxHandler'],
    submapDataWithBounds?: SubmapDataWithBounds,
) {
    if (!submapDataWithBounds) return

    const { topLeft, bottomRight } = panePosition;

    const boxWidth = Math.abs(topLeft.x - bottomRight.x);
    const boxHeight = Math.abs(topLeft.y - bottomRight.y);

    const boxContainer = document.createElement('div')
    boxContainer.className = 'highlight-box-hover-container'
    boxContainer.style.top = topLeft.y + 'px'
    boxContainer.style.left = topLeft.x + 'px'
    boxContainer.style.minHeight = boxHeight + 'px'
    boxContainer.style.minWidth = boxWidth < 200 ? `200px` : `${boxWidth}px`

    const headerDiv = document.createElement('div')
    headerDiv.className = 'highlight-box-header'
    
    const menuBtnsContainer = document.createElement('div');
    menuBtnsContainer.style.display = 'none';
    menuBtnsContainer.classList.add('menu-btns-container', 'highlight-box-menu-btns-container')

    const hamburgerMenuButton = document.createElement('button');
    hamburgerMenuButton.className = 'menu-button highlight-box-menu-btn';
    hamburgerMenuButton.innerHTML = menu;
    hamburgerMenuButton.addEventListener('click', () => {
        if (menuBtnsContainer.style.display === 'none') {
            menuBtnsContainer.style.display = 'flex'
        } else {
            menuBtnsContainer.style.display = 'none'
        }
    })

    const boxHeader = document.createElement('h3');
    boxHeader.textContent = name

    const p = document.createElement('p')
    p.textContent = description;

    const menuBtns = []
    SUBMAP_DOWNLOAD_OPTIONS.forEach(option => {
        const btn = document.createElement('button')
        btn.textContent = `Download ${option.display}`
        btn.classList.add('area-select-button', 'highlight-box-button')
        btn.addEventListener(
          'click',
          () => {
            if (submapDataWithBounds) {
              downloadSubmap(submapDataWithBounds, option.ext)
            }
          }
        )
        menuBtns.push(btn)
      })

    const hideBoxBtn = document.createElement('button')
    hideBoxBtn.textContent = 'Hide Box'
    hideBoxBtn.classList.add('area-select-button', 'highlight-box-button')
    hideBoxBtn.addEventListener('click', hideBoxHandler)
    menuBtns.push(hideBoxBtn)
        
    const deleteBtn = document.createElement('button')
    deleteBtn.textContent = 'Delete Box'
    deleteBtn.classList.add('area-select-button', 'highlight-box-button', 'delete-box-button')
    deleteBtn.addEventListener('click', () => {
        fetch(`${SERVICE_URL}/highlights/boxes/${boxId}`, {method: 'DELETE'})
    })
    menuBtns.push(deleteBtn)

    menuBtnsContainer.append(...menuBtns)

    headerDiv.append(hamburgerMenuButton, menuBtnsContainer, boxHeader)

    boxContainer.append(headerDiv, p)

    container.append(boxContainer)
}

type CustomBoxPaneProps = {
    boxId: number;
    paneName: string;
    zIndex: number,
    boxName: string;
    boxDescription: string;
    submapDataWithBounds?: SubmapDataWithBounds;
    panePosition: {
        topLeft: L.Point,
        bottomRight: L.Point,
    };
    hideBoxHandler: () => void;
}

export function CustomBoxPane({ 
    boxId,
    paneName, 
    zIndex,
    boxName,
    boxDescription,
    panePosition,
    submapDataWithBounds,
    hideBoxHandler,
}: CustomBoxPaneProps) {
    const map = useMap();
  
    useEffect(() => {
      if (!map.getPane(paneName)) {
        const pane = map.createPane(paneName);
        pane.style.zIndex = String(zIndex);

        pane.addEventListener(
            'mouseover', 
            () => {
                if (pane && pane instanceof HTMLDivElement) {
                    const firstChild = pane.firstChild as HTMLDivElement
                    firstChild.style.display = 'block'
                }
            }
        )

        pane.addEventListener(
            'mouseout',
            () => {
                if (pane && pane instanceof HTMLDivElement) {
                    const firstChild = pane.firstChild as HTMLDivElement
                    firstChild.style.display = 'none'
                }
            }
        )
      }
    }, [map, paneName, zIndex]);

    useEffect(() => {
        const pane = map.getPane(paneName);

        while (pane?.firstChild) {
            pane.removeChild(pane.firstChild)
        }

        generateBoxContent(
            boxId,
            pane as HTMLDivElement,
            boxName,
            boxDescription,
            panePosition,
            hideBoxHandler,
            submapDataWithBounds,
        )

    }, [map, submapDataWithBounds])
  
    return null;
}

export function HighlightBoxLayer({
    box, 
    submapData,
}: HighlightBoxLayerProps) {
    const map = useMap();
    const layer = useRef<L.Rectangle | null>(null);

    const hideBoxHandler = useCallback(() => {
        if (layer.current) {
            map.removeLayer(layer.current)
        }
    }, [map, layer])

    const bounds = useMemo(
        () => (
            latLngBounds(
                latLng(box.top_left_dec, box.top_left_ra),
                latLng(box.bottom_right_dec, box.bottom_right_ra),
            )
        ), [box]
    )

    const submapDataWithBounds = useMemo(() => {
        if (!submapData) return;        
        return {
            ...submapData,
            ...getTopLeftBottomRightFromBounds(bounds)
        }
    }, [bounds, submapData])

    return (
        <LayersControl.Overlay name={box.name}>
            <CustomBoxPane
                boxId={box.id}
                paneName={`highlight-boxes-pane-${box.id}`}
                zIndex={500}
                boxName={box.name}
                boxDescription={box.description}
                panePosition={{
                    topLeft: map.latLngToLayerPoint(bounds.getNorthWest()),
                    bottomRight: map.latLngToLayerPoint(bounds.getSouthEast())
                }}
                submapDataWithBounds={submapDataWithBounds}
                hideBoxHandler={hideBoxHandler}
            />
            <Rectangle
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
    )
}