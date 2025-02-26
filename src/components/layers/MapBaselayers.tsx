import { Band } from '../../types/maps';
import { LayersControl, TileLayer } from 'react-leaflet';
import { latLngBounds, latLng } from 'leaflet';
import { makeLayerName } from '../../utils/layerUtils';
import { SERVICE_URL } from '../../configs/mapSettings';
import '../styles/map-baselayers.css';

type Props = {
  /** array of Band objects that contains a baselayer's data */
  bands: Band[];
  /** the Band id that represents the selected baselayer; higher-up, activeBaselayer defaults to first band returned by server */
  activeBaselayerId?: number;
  /** the cmap used in the tile server request */
  cmap?: string;
  /** the vmin used in the tile server request */
  vmin?: number;
  /** the vmax used in the tile server request */
  vmax?: number;
};

/**
 * Sets each band to be a baselayer and sets up the TileLayer according to the band- and user-set attributes
 * @param {Props} props Refer to the props definition
 * @returns The baselayers for the Leaflet map
 */
export function MapBaselayers({
  bands,
  activeBaselayerId,
  cmap,
  vmin,
  vmax,
}: Props) {
  return bands.map((band) => {
    return (
      <LayersControl.BaseLayer
        key={`${band.map_name}-${band.id}`}
        checked={band.id === activeBaselayerId}
        name={makeLayerName(band)}
      >
        <TileLayer
          id={String(band.id)}
          className="tile-baselayer"
          url={`${SERVICE_URL}/maps/${band.map_id}/${band.id}/{z}/{y}/{x}/tile.png?cmap=${cmap}&vmin=${vmin}&vmax=${vmax}`}
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
