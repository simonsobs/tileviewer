import { SourceList } from '../../types/maps';
import {
  LayersControl,
  FeatureGroup,
  CircleMarker,
  Popup,
} from 'react-leaflet';

type Props = {
  sources: SourceList[];
};

/**
 * Sets each sourceList as an overlay, with each of its sources contained within a FeatureGroup and displayed as a
 * circle that, when clicked, shows a popup with the source details.
 * @param sources an array of SourceList objects
 * @returns
 */
export function SourceListOverlays({ sources }: Props) {
  return sources.map((sourceList) => {
    return (
      <LayersControl.Overlay
        key={`${sourceList.name}-${sourceList.id}`}
        name={sourceList.name}
      >
        <FeatureGroup>
          {sourceList.sources.map((source) => {
            return (
              <CircleMarker
                key={`marker-${sourceList.id}-${source.id}`}
                center={[source.dec, source.ra]}
                radius={5}
              >
                <Popup>
                  <div className="source-popup">
                    {source.name ? <h3>{source.name}</h3> : null}
                    <p>
                      <span>RA, Dec:</span> ({source.ra}, {source.dec})
                    </p>
                    <p>
                      <span>Flux:</span> {source.flux}
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </FeatureGroup>
      </LayersControl.Overlay>
    );
  });
}
