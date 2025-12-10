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
  const expandedState: Set<string> = new Set<string>();
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
 * Helper to check if node's name matches the query
 * @param name
 * @param query
 * @returns boolean
 */
function match(name: string, query: string) {
  const lcQuery = query.trim().toLowerCase();
  return name.toLowerCase().includes(lcQuery);
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
  const matchedIds = new Set<string>();

  const filteredMapGroups = mapGroups
    .map((group) => {
      const groupMatched = match(group.name, query);

      // If group matches, keep group intact
      if (groupMatched) {
        matchedIds.add(group.name);
        return group;
      }

      // Build filteredMaps (children may be filtered even if group matches;
      // we'll decide which to return below)
      const filteredMaps = group.maps
        .map((map) => {
          const mapMatched = match(map.name, query);

          // If map matches, keep map intact
          if (mapMatched) {
            matchedIds.add(map.map_id);
            return map;
          }

          const filteredBands = map.bands
            .map((band) => {
              const bandMatched = match(band.name, query);

              // If band matches, keep band intact
              if (bandMatched) {
                matchedIds.add(band.band_id);
                return band;
              }

              const filteredLayers = band.layers.filter((layer) => {
                const layerMatched = match(layer.name, query);
                if (layerMatched) matchedIds.add(layer.layer_id);
                return layerMatched;
              });

              // Otherwise include band only if any layer matched
              if (filteredLayers.length > 0) {
                return { ...band, layers: filteredLayers };
              }
            })
            .filter(Boolean) as BandResponse[];

          // Otherwise include map only if any band matched
          if (filteredBands.length > 0) {
            return { ...map, bands: filteredBands };
          }
        })
        .filter(Boolean) as MapResponse[];

      // Otherwise include group only if any map matched
      if (filteredMaps.length > 0) {
        return { ...group, maps: filteredMaps };
      }
    })
    .filter(Boolean) as MapGroupResponse[];

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
