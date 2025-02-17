import L from 'leaflet';

/**
 * L.CRS.EPSG4326 is an extension of L.CRS.Earth and L.CRS.Earth extends L.CRS
 * Thus, the zoom and scale methods in EPSG4326 and Earth come from L.CRS, and
 * L.CRS assumes a tileSize of 256 pixels. Therefore, we override those methods
 * here with the tileSize calculated by tilemaker and provided as a property
 * of `band`.
 */
export function getCustomCRS(tileSize: number) {
  return L.Util.extend({}, L.CRS.EPSG4326, {
    scale: function (zoom: number) {
      // Replace 256 so that the math is based on our tile size.
      return tileSize * Math.pow(2, zoom);
    },

    zoom: function (scale: number) {
      // Replace 256 so that the math is based on our tile size.
      return Math.log(scale / tileSize) / Math.LN2;
    },
  });
}
