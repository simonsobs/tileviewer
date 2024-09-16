import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { mapOptions, SERVER } from './configs/settings';

function App() {
  const [maps, setMaps] = useState(undefined);
  const [mapsMetadata, setMapsMetadata] = useState(undefined);

  useEffect(() => {
    async function getMapsAndMetadata() {
      const availableMaps = await fetch(`${SERVER}/maps`);
      const availableMapsResponse = await availableMaps.json();
      setMaps(availableMapsResponse)
      console.log(availableMapsResponse)
      const availableMapsMetadata = await Promise.all(
        availableMapsResponse.map(
          // @ts-ignore
          async (resp) => (await fetch(`${SERVER}/maps/${resp.name}`)).json()
        )
        // @ts-ignore
      )
      console.log(availableMapsMetadata)
    }
    getMapsAndMetadata();
  }, [])

  return (
    <MapContainer id='map' {...mapOptions}>
      {/* <TileLayer
        url={`${SERVER}/maps/FITS_Maps/1/{z}/{y}/{x}/tile.png`}
        tms
        noWrap
      /> */}
      {/* <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      /> */}
    </MapContainer>
  )
}

export default App
