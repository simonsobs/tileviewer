import { useCallback, useEffect, useState } from 'react';
import { LayersControl, MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import { latLng, latLngBounds } from 'leaflet';
import { mapOptions, SERVER } from './configs/settings';
import { BandWithLayerName, MapMetadataResponse, MapResponse } from './types/maps';
import { makeLayerName } from './utils/layerUtils';
import { ColorMapControls } from './components/ColorMapControls';

function App() {
  const [vmin, setVMin] = useState(-500);
  const [vmax, setVMax] = useState(500);
  const [cmap, setCmap] = useState<string | undefined>(undefined);
  const [activeLayerName, setActiveLayerName] = useState<string | undefined>(undefined);
  const [bands, setBands] = useState<BandWithLayerName[] | undefined>(undefined);

  useEffect(() => {
    async function getMapsAndMetadata() {
      const availableMaps = await fetch(`${SERVER}/maps`);
      const availableMapsResponse: MapResponse[] = await availableMaps.json();
      const availableMapsMetadata: MapMetadataResponse[] = await Promise.all(
        availableMapsResponse.map(
          async (resp) => (await fetch(`${SERVER}/maps/${resp.name}`)).json()
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
      if (!activeLayerName) {
        setActiveLayerName(tempBands[0].layer_name)
        setVMin(tempBands[0].recommended_cmap_min)
        setVMax(tempBands[0].recommended_cmap_max)
        setCmap(tempBands[0].recommended_cmap)
      } else {
        const activeBand = tempBands.find(band => band.layer_name === activeLayerName);
        setVMin(activeBand!.recommended_cmap_min)
        setVMin(activeBand!.recommended_cmap_max)
        setCmap(activeBand!.recommended_cmap)
      }
    }
    getMapsAndMetadata();
  }, [])

  const onBaseLayerChange = useCallback(
    (name: string) => {
      setActiveLayerName(name)
    }, []
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
    activeLayerName && bands?.length && cmap && (
      <>
        <MapContainer id='map' {...mapOptions}>
          <LayersControl>
            {bands?.map(
                (band) => {
                return (
                  <LayersControl.BaseLayer key={band.layer_name} checked={band.layer_name === activeLayerName} name={band.layer_name}>
                    <TileLayer
                      url={`${SERVER}/maps/FITS_Maps/${band.id}/{z}/{y}/{x}/tile.png?cmap=${cmap}&vmin=${vmin}&vmax=${vmax}`}
                      tms
                      noWrap
                      bounds={
                        latLngBounds(
                          latLng(band.bounding_top, band.bounding_left),
                          latLng(band.bounding_bottom, band.bounding_right),
                        )
                      }
                    />
                  </LayersControl.BaseLayer>
                )
              }
            )}
          </LayersControl>
          <MapEvents onBaseLayerChange={onBaseLayerChange} />
        </MapContainer>
        <ColorMapControls
          values={[vmin, vmax]}
          onCmapValuesChange={onCmapValuesChange}
          cmap={cmap}
          onCmapChange={onCmapChange}
        />
      </>
    )
  )
}

type MapEventsProps = {
  onBaseLayerChange: (newBaseLayer: string) => void; 
}

function MapEvents({onBaseLayerChange}: MapEventsProps) {
  useMapEvents({
    baselayerchange: (e: { name: string }) => {
      onBaseLayerChange(e.name)
    }
  })
  return null
}

export default App
