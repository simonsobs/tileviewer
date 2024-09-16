import { useEffect, useState } from 'react';
import { Circle, LayersControl, MapContainer, TileLayer, useMap } from 'react-leaflet';
import { latLng, latLngBounds } from 'leaflet';
import { mapOptions, SERVER } from './configs/settings';
import { Band, MapMetadataResponse, MapResponse } from './types/maps';

function App() {
  const [maps, setMaps] = useState<undefined | MapResponse[]>(undefined);
  const [mapsMetadata, setMapsMetadata] = useState<undefined | MapMetadataResponse[]>(undefined);
  const [vmin, setVMin] = useState(-500);

  useEffect(() => {
    async function getMapsAndMetadata() {
      const availableMaps = await fetch(`${SERVER}/maps`);
      const availableMapsResponse: MapResponse[] = await availableMaps.json();
      setMaps(availableMapsResponse)
      const availableMapsMetadata: MapMetadataResponse[] = await Promise.all(
        availableMapsResponse.map(
          async (resp) => (await fetch(`${SERVER}/maps/${resp.name}`)).json()
        )
      )
      setMapsMetadata(availableMapsMetadata)
    }
    getMapsAndMetadata();
  }, [])

  const bands = mapsMetadata ? mapsMetadata.reduce((prev: Band[], curr: MapMetadataResponse) => curr.bands ? prev.concat(curr.bands) : prev, []) : undefined;
  console.log(bands)

  const activeLayer = bands ? bands[0] : undefined;

  return (
    activeLayer && mapsMetadata && (
      <>
        <input type='number' value={vmin} onChange={e => setVMin(Number(e.target.value))}/>
        <MapContainer id='map' {...mapOptions}>
          <LayersControl>
            {bands?.map(
                (d, i) => {
                  const mapName = d.map_name;
                  const mapMetadata = mapsMetadata.find(d => d.name === mapName);
                return (
                  <LayersControl.BaseLayer checked={i === 0} name={`${mapMetadata?.telescope} ${mapMetadata?.data_release} ${d.frequency} GHz (${d.stokes_parameter}, ${mapMetadata?.tags})`}>
                    <TileLayer
                      url={`${SERVER}/maps/FITS_Maps/${d.id}/{z}/{y}/{x}/tile.png?cmap=${d.recommended_cmap}&vmin=${vmin}&vmax=${d.recommended_cmap_max}`}
                      tms
                      noWrap
                      bounds={
                        latLngBounds(
                          latLng(d.bounding_top, d.bounding_left),
                          latLng(d.bounding_bottom, d.bounding_right),
                        )
                      }
                    />
                  </LayersControl.BaseLayer>
                )
              }
            )}
          </LayersControl>
        </MapContainer>
      </>
    )
  )
}

export default App
