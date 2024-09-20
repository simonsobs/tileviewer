import { createControlComponent } from "@react-leaflet/core";
import { Control } from "leaflet";
import { MAX_SCALE_WIDTH } from "../configs/mapSettings";

/**
 * NOTE: I cast private vars and methods as "any" in order to remove some
 * annoying TS errors. We may want to figure out a more type-safe solution,
 * though Leaflet's source code confirms these vars and methods exist!
 * https://github.com/Leaflet/Leaflet/blob/main/src/control/Control.Scale.js
 */

const AstroControl = Control.Scale.extend({
    ...Control.Scale.prototype,
    options: {
        position: 'bottomright',
	    imperial: false,
	    maxWidth: MAX_SCALE_WIDTH,
    },
    _update() {
        const map = (this as any)._map;
        const center = map.getCenter();
        const y = map.getSize().y / 2;
        const maxMeters = map.distance(
            map.containerPointToLatLng([0, y]),
            map.containerPointToLatLng([this.options.maxWidth, y]),
        );
        // this calculation is based on info from https://www.opendem.info/arc2meters.html
        const maxArcsec = Math.abs(maxMeters / (Math.cos(center.lat) * 1852 / 60));

        (this as any)._updateScales(maxArcsec)
    
    },
    _updateMetric: function(maxArcsec: number) {
        // this method is adapted from the tilerfrontend prototype (see link)
        // https://github.com/simonsobs/tilerfrontend/blob/65fb52ec9e70b061a47f4ec112552c4bf60e63e5/src/astroControl.ts#L13
        // a notable difference is that I've passed in maxArcsec from the _update method in order to access the map's methods
	    let maxUnit = maxArcsec;
	    let unitName = 'arcsec';
		
	    if (maxArcsec > 7200) {
	        // degrees
	        maxUnit /= 3600;
	        unitName = 'deg';
	    } else if (maxArcsec >= 180) {
	        // arcmin
	        maxUnit /= 60;
	        unitName = 'arcmin';
	    }
	    const unit = (this as any)._getRoundNum(maxUnit);
        const ratio = unit/maxUnit;
		(this as any)._mScale.style.width = Math.round(this.options.maxWidth * ratio) + 'px';
	    (this as any)._mScale.innerHTML = unit + ' ' + unitName;
    }
})

export const AstroScale = createControlComponent(
    (props) => new AstroControl(props),
)
