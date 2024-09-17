import { useCallback, useEffect, useRef, useState } from 'react';
import { Circle, LayersControl, MapContainer, Pane, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { latLng, latLngBounds, Map } from 'leaflet';
import { mapOptions, SERVER } from './configs/settings';
import { BandWithLayerName, MapMetadataResponse, MapResponse } from './types/maps';
import { makeLayerName } from './utils/layerUtils';

function App() {
  const [vmin, setVMin] = useState(-500);
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
      }
    }
    getMapsAndMetadata();
  }, [])

  const onBaseLayerChange = useCallback(
    (name: string) => {
      setActiveLayerName(name)
    }, []
  )

  return (
    activeLayerName && bands?.length && (
      <>
        <MapContainer id='map' {...mapOptions}>
          <LayersControl>
            {bands?.map(
                (band) => {
                return (
                  <LayersControl.BaseLayer key={band.layer_name} checked={band.layer_name === activeLayerName} name={band.layer_name}>
                    <TileLayer
                      url={`${SERVER}/maps/FITS_Maps/${band.id}/{z}/{y}/{x}/tile.png?cmap=${band.recommended_cmap}&vmin=${vmin}&vmax=${band.recommended_cmap_max}`}
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
        <div className='cmap-controls-pane'>
          <input type='number' value={vmin} onChange={e => setVMin(Number(e.target.value))}/>
        </div>
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
