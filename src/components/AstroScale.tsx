import { createControlComponent } from '@react-leaflet/core';
import L from 'leaflet';
import { GraticuleDetails } from '../types/maps';

interface AstroScaleOptions extends L.ControlOptions {
  position: L.ControlPosition;
  imperial: boolean;
  graticuleDetails: GraticuleDetails;
}

interface AstroScale extends L.Control.Scale {
  _mScale: HTMLDivElement;
}

const AstroControl = L.Control.Scale.extend({
  ...L.Control.Scale.prototype,
  _updateMetric: function (this: AstroScale) {
    const degrees = (this.options as AstroScaleOptions).graticuleDetails
      .interval;
    const scaleWidth = (this.options as AstroScaleOptions).graticuleDetails
      .pixelWidth;
    let unitName = 'deg';
    let value = degrees;

    if (degrees < 1 / 60) {
      value = degrees * 60 * 60;
      unitName = 'arcsec';
    } else if (degrees < 1) {
      value = degrees * 60;
      unitName = 'arcmin';
    }
    this._mScale.style.width = scaleWidth + 'px';
    this._mScale.innerHTML = value + ' ' + unitName;
  },
});

export const AstroScaleControl = createControlComponent(
  (props: AstroScaleOptions) => new AstroControl(props)
);

type Props = {
  graticuleDetails: { pixelWidth: number; interval: number };
};

export function AstroScale({ graticuleDetails }: Props) {
  return (
    <AstroScaleControl
      key={graticuleDetails.pixelWidth + graticuleDetails.interval}
      position="bottomright"
      imperial={false}
      graticuleDetails={graticuleDetails}
    />
  );
}
