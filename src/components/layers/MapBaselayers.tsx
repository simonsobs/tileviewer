import { Band, BaselayerState } from '../../types/maps';
import { LayersControl, TileLayer } from 'react-leaflet';
import { latLngBounds, latLng } from 'leaflet';
import { makeLayerName } from '../../utils/layerUtils';
import { SERVICE_URL } from '../../configs/mapSettings';
import '../styles/map-baselayers.css';

type Props = {
  /** array of Band objects that contains a baselayer's data */
  bands: Band[];

  baselayerState: BaselayerState;
};

/**
 * Sets each band to be a baselayer and sets up the TileLayer according to the band- and user-set attributes
 * @param {Props} props Refer to the props definition
 * @returns The baselayers for the Leaflet map
 */
export function MapBaselayers({ bands, baselayerState }: Props) {
  const { activeBaselayer, cmap, cmapValues } = baselayerState;
  return bands.map((band) => {
    return (
      <LayersControl.BaseLayer
        key={`${band.map_name}-${band.id}`}
        checked={band.id === activeBaselayer!.id}
        name={makeLayerName(band)}
      >
        <TileLayer
          id={String(band.id)}
          key={`tilelayer-${band.map_name}-${band.id}`}
          className="tile-baselayer"
          url={`${SERVICE_URL}/maps/${band.map_id}/${band.id}/{z}/{y}/{x}/tile.png?cmap=${cmap}&vmin=${cmapValues!.min}&vmax=${cmapValues!.max}`}
          tms
          noWrap
          bounds={latLngBounds(
            latLng(band.bounding_top, band.bounding_left),
            latLng(band.bounding_bottom, band.bounding_right)
          )}
          maxZoom={Math.max(...bands.map((b) => b.levels)) + 3}
          maxNativeZoom={band.levels - 1}
          tileSize={band.tile_size}
        />
      </LayersControl.BaseLayer>
    );
  });
}
