import { useCallback, useEffect, useState } from 'react';
import { LayersControl, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { latLng, LatLngBounds, latLngBounds } from 'leaflet';
import { mapOptions, SERVICE_URL, DEFAULT_MIN_ZOOM } from './configs/mapSettings';
import { BandWithLayerName, GraticuleDetails, MapMetadataResponse, MapResponse } from './types/maps';
import { makeLayerName } from './utils/layerUtils';
import { getControlPaneOffsets } from './utils/paneUtils';
import { ColorMapControls } from './components/ColorMapControls';
import { CoordinatesDisplay } from './components/CoordinatesDisplay';
import { AstroScale } from './components/AstroScale';
import { AreaSelection } from './components/AreaSelection';
import { GraticuleLayer } from './components/GraticuleLayer';

function App() {
  const [vmin, setVMin] = useState<number | undefined>(undefined);
  const [vmax, setVMax] = useState<number | undefined>(undefined);
  const [cmap, setCmap] = useState<string | undefined>(undefined);
  const [activeLayer, setActiveLayer] = useState<BandWithLayerName | undefined>(undefined);
  const [bands, setBands] = useState<BandWithLayerName[] | undefined>(undefined);
  const [selectionBounds, setSelectionBounds] = useState<LatLngBounds | undefined>(undefined);
  const [graticuleDetails, setGraticuleDetails] = useState<undefined | GraticuleDetails>(undefined);

  useEffect(() => {
    async function getMapsAndMetadata() {
      const availableMaps = await fetch(`${SERVICE_URL}/maps`);
      const availableMapsResponse: MapResponse[] = await availableMaps.json();
      const availableMapsMetadata: MapMetadataResponse[] = await Promise.all(
        availableMapsResponse.map(
          async (resp) => (await fetch(`${SERVICE_URL}/maps/${resp.name}`)).json()
        )
      )
      const tempBands = availableMapsMetadata.reduce(
        (prev: BandWithLayerName[], curr: MapMetadataResponse) => {
          if (curr.bands) {
            return prev.concat(curr.bands.map(band => ({...band, 'layer_name': makeLayerName(curr, band)})))
          } else {
            return prev
          }
        }, []);
      setBands(tempBands)
      if (!activeLayer) {
        setActiveLayer(tempBands[0])
        setVMin(tempBands[0].recommended_cmap_min)
        setVMax(tempBands[0].recommended_cmap_max)
        setCmap(tempBands[0].recommended_cmap)
      } else {
        const activeBand = tempBands.find(band => band.layer_name === activeLayer.layer_name);
        setVMin(activeBand!.recommended_cmap_min)
        setVMin(activeBand!.recommended_cmap_max)
        setCmap(activeBand!.recommended_cmap)
      }
    }
    getMapsAndMetadata();
  }, [])

  const onBaseLayerChange = useCallback(
    (name: string) => {
      setActiveLayer(bands?.find(b => b.layer_name === name))
    }, [bands, setActiveLayer]
  )

  const onCmapValuesChange = useCallback(
    (values: number[]) => {
      setVMin(values[0])
      setVMax(values[1])
    }, [setVMin, setVMax]
  )

  const onCmapChange = useCallback(
    (cmap: string) => {
      setCmap(cmap)
    }, [setCmap]
  )

  return (
      <>
        <MapContainer
          id='map'
          {...mapOptions}
        >
          <LayersControl>
            {bands?.map(
                (band) => {
                return (
                  <LayersControl.BaseLayer key={band.layer_name} checked={band.layer_name === activeLayer?.layer_name} name={band.layer_name}>
                    <TileLayer
                      url={`${SERVICE_URL}/maps/${band.map_name}/${band.id}/{z}/{y}/{x}/tile.png?cmap=${cmap}&vmin=${vmin}&vmax=${vmax}`}
                      tms
                      noWrap
                      bounds={
                        latLngBounds(
                          latLng(band.bounding_top, band.bounding_left),
                          latLng(band.bounding_bottom, band.bounding_right),
                        )
                      }
                      minZoom={DEFAULT_MIN_ZOOM}
                      maxZoom={band.levels + 3}
                      minNativeZoom={band.levels - 4}
                      maxNativeZoom={band.levels - 1}
                    />
                  </LayersControl.BaseLayer>
                )
              }
            )}
          </LayersControl>
          <GraticuleLayer setGraticuleDetails={setGraticuleDetails} />
          <CoordinatesDisplay />
          {graticuleDetails && <AstroScale graticuleDetails={graticuleDetails} />}
          <AreaSelection handleSelectionBounds={setSelectionBounds} />
          <MapEvents onBaseLayerChange={onBaseLayerChange} selectionBounds={selectionBounds} />
        </MapContainer>
        {vmin && vmax && cmap && activeLayer && (
          <ColorMapControls
            values={[vmin, vmax]}
            onCmapValuesChange={onCmapValuesChange}
            cmap={cmap}
            onCmapChange={onCmapChange}
            activeLayerId={activeLayer.id}
          />
        )}
      </>
    )
}

type MapEventsProps = {
  onBaseLayerChange: (newBaseLayer: string) => void;
  selectionBounds?: L.LatLngBounds;
}

function MapEvents({onBaseLayerChange, selectionBounds}: MapEventsProps) {
  const map = useMap();
  useMapEvents({
    baselayerchange: (e: { name: string }) => {
      onBaseLayerChange(e.name)
    },
    zoomend: () => {
      const regionControlsOverlay = map.getPane('region-controls-overlay');
      if (
        regionControlsOverlay &&
        regionControlsOverlay.style.display === 'block' &&
        selectionBounds
      ) {
        const {
          top,
          left,
          width,
          height,
        } = getControlPaneOffsets(map, selectionBounds);
        regionControlsOverlay.style.top = top as string;
        regionControlsOverlay.style.left = left as string;
        regionControlsOverlay.style.width = width as string;
        regionControlsOverlay.style.height = height as string;
      }
    }
  })
  return null
}

export default App
