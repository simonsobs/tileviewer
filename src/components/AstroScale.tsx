import { createControlComponent } from "@react-leaflet/core";
import L from "leaflet";
import { MAX_SCALE_WIDTH } from "../configs/mapSettings";
import { GraticuleDetails } from "../types/maps";

interface AstroScaleOptions extends L.ControlOptions {
    position: L.ControlPosition;
    imperial: boolean;
    maxWidth: number;
    graticuleDetails: GraticuleDetails;
  }

const AstroControl = L.Control.Scale.extend({
    ...L.Control.Scale.prototype,
    _updateMetric: function() {
	    // meters -> arcsec
        const degrees = (this.options as AstroScaleOptions).graticuleDetails.interval;
        const scaleWidth = (this.options as AstroScaleOptions).graticuleDetails.pixelWidth;
        let unitName = 'deg';
	    // var maxArcsec = maxMeters / 30.87;
	    // var maxUnit = maxArcsec;
	    // var unitName = 'arcsec';
	    // if (maxArcsec > 7200) {
	    //     // degrees
	    //     maxUnit /= 3600;
	    //     unitName = 'deg';
	    // } else if (maxArcsec >= 180) {
	    //     // arcmin
	    //     maxUnit /= 60;
	    //     unitName = 'arcmin';
	    // }
	    // var unit = (this as any)._getRoundNum(maxUnit);
		(this as any)._mScale.style.width = scaleWidth + 'px';
	    (this as any)._mScale.innerHTML = degrees + ' ' + unitName;
    }
})

export const AstroScaleControl = createControlComponent(
    (props: AstroScaleOptions) => new AstroControl(props),
)

type Props = {
    graticuleDetails: {pixelWidth: number, interval: number};
}

export function AstroScale({graticuleDetails}: Props) {
    return (
        <AstroScaleControl
            key={graticuleDetails.pixelWidth + graticuleDetails.interval}
            position='bottomright'
            imperial={false}
            maxWidth={MAX_SCALE_WIDTH}
            graticuleDetails={graticuleDetails}
        />
    )
}