import {
  MapGroupResponse,
  MapResponse,
  BandResponse,
  LayerResponse,
} from '../types/maps';
import { EXTERNAL_DETAILS_ID } from '../configs/mapSettings';
import { LayerSelectorProps } from '../components/LayerSelector';

/**
 * <details> elements are closed by default. This method traverses to the selected baselayer
 * and add its ID and its parent IDs to a Set that is then used to control the "open" state
 * of the details elements such that, on render, the selected baselayer is shown.
 * @param mapGroups
 * @param activeBaselayerId
 * @returns A set of IDs that are used to control the open/close state of <details> elements
 */
export function getDefaultExpandedState(
  mapGroups: MapGroupResponse[],
  activeBaselayerId: LayerSelectorProps['activeBaselayerId']
) {
  const expandedState: Set<String> = new Set<String>();
  // Used for the comparison maps, which we default to open
  expandedState.add(EXTERNAL_DETAILS_ID);

  // Iterate over each mapGroup -> map -> band -> layer until we find the selected
  // baselayer, at which point add the associated ID and parent IDs to the Set and
  // break out of the loop/function via the return statement
  for (const group of mapGroups) {
    for (const map of group.maps) {
      for (const band of map.bands) {
        for (const layer of band.layers) {
          if (layer.layer_id === activeBaselayerId) {
            expandedState.add(band.band_id);
            expandedState.add(map.map_id);
            expandedState.add(group.name);
            return expandedState;
          }
        }
      }
    }
  }

  // activeBaselayerId wasn't found, so return with only the comparison section's ID
  return expandedState;
}

/**
 * Applies the search query to filter away nodes from each mapGroup (or the mapGroup itself) while also
 * adding IDs to a matchedIds set in order to determine which nodes should apply the <mark> element
 * to its name.
 * @param mapGroups
 * @param query
 * @returns An object with a list of filteredMapGroups and a set of matchedIds. The list of
 * filteredMapGroups contains mapGroups that have removed nodes that do not match the search
 * filter. The set of matchedIds is used to determine which node should have the <mark>
 * elements applied to the matching search query.
 */
export function filterMapGroups(mapGroups: MapGroupResponse[], query: string) {
  const lcQuery = query.toLowerCase();
  const filteredMapGroups: MapGroupResponse[] = [];
  const matchedIds = new Set<String>();
  mapGroups.forEach((mapGroup) => {
    if (mapGroup.name.toLowerCase().includes(lcQuery)) {
      filteredMapGroups.push(mapGroup);
      matchedIds.add(mapGroup.name);
    } else {
      const maps: MapResponse[] = [];
      mapGroup.maps.forEach((map) => {
        if (map.name.toLowerCase().includes(lcQuery)) {
          maps.push(map);
          matchedIds.add(map.map_id);
        } else {
          map.bands.forEach((band) => {
            if (band.name.toLowerCase().includes(lcQuery)) {
              maps.push(map);
              matchedIds.add(band.band_id);
            } else {
              band.layers.forEach((layer) => {
                if (layer.name.toLowerCase().includes(lcQuery)) {
                  maps.push(map);
                  matchedIds.add(layer.layer_id);
                }
              });
            }
          });
        }
      });
      if (maps.length) {
        filteredMapGroups.push({ ...mapGroup, maps });
      }
    }
  });
  return { filteredMapGroups, matchedIds };
}

/**
 * Simple utility function that takes any node and returns its ID. In the case of a MapGroup,
 * the name attribute is used as its ID.
 * @param node
 * @returns The ID of a node
 */
export function getNodeId(
  node: MapGroupResponse | MapResponse | BandResponse | LayerResponse
) {
  let id = node.name;
  if ('layer_id' in node) {
    id = node.layer_id;
  } else if ('band_id' in node) {
    id = node.band_id;
  } else if ('map_id' in node) {
    id = node.map_id;
  }
  return id;
}
