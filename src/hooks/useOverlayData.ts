import { useState, useCallback, ChangeEvent } from 'react';
import { SourceGroup } from '../types/sources';
import { Box } from '../types/submaps';
import { useQuery } from './useQuery';
import { mapApi } from '../api/client';

export type SourceGroupData = {
  sourceGroups: SourceGroup[] | undefined;
  activeSourceGroupIds: string[];
  areSourceGroupsLoading: boolean;
  onSelectedSourceGroupsChange: (e: ChangeEvent<HTMLInputElement>) => void;
};

export type HighlightBoxData = {
  highlightBoxes: Box[] | undefined;
  activeBoxIds: number[];
  areHighlightBoxesLoading: boolean;
  onSelectedHighlightBoxChange: (e: ChangeEvent<HTMLInputElement>) => void;
  setActiveBoxIds: React.Dispatch<React.SetStateAction<number[]>>;
};

export type OverlayData = SourceGroupData & HighlightBoxData;

export function useOverlayData(isAuthenticated: boolean | null): OverlayData {
  /** tracks highlight boxes that are "checked" and visible on the map  */
  const [activeBoxIds, setActiveBoxIds] = useState<number[]>([]);

  /** tracks source groups that are "checked" and visible on the map  */
  const [activeSourceGroupIds, setActiveSourceGroupIds] = useState<string[]>(
    []
  );

  /** sourceLists are used as FeatureGroups in the map, which can be toggled on/off in the map legend */
  const { data: sourceGroups, isLoading: areSourceGroupsLoading } = useQuery<
    SourceGroup[] | undefined
  >({
    initialData: undefined,
    queryKey: [isAuthenticated],
    queryFn: async () => {
      // Fetch the sources
      const sourceGroups = await mapApi.getSources();
      return sourceGroups;
    },
  });

  const { data: highlightBoxes, isLoading: areHighlightBoxesLoading } =
    useQuery<Box[] | undefined>({
      initialData: undefined,
      queryKey: [isAuthenticated],
      queryFn: async () => {
        // Fetch the highlight boxes
        const boxes = await mapApi.getHighlightBoxes();

        return boxes;
      },
    });

  const onSelectedSourceGroupsChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (!sourceGroups) return;
      if (e.target.checked) {
        setActiveSourceGroupIds((prevState) =>
          prevState.concat(e.target.value)
        );
      } else {
        setActiveSourceGroupIds((prevState) =>
          prevState.filter((id) => id !== e.target.value)
        );
      }
    },
    [sourceGroups]
  );

  const onSelectedHighlightBoxChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (!highlightBoxes) return;
      if (e.target.checked) {
        setActiveBoxIds((prevState) =>
          prevState.concat(Number(e.target.value))
        );
      } else {
        setActiveBoxIds((prevState) =>
          prevState.filter((id) => id !== Number(e.target.value))
        );
      }
    },
    [highlightBoxes]
  );

  return {
    sourceGroups,
    activeSourceGroupIds,
    areSourceGroupsLoading,
    onSelectedSourceGroupsChange,
    highlightBoxes,
    activeBoxIds,
    areHighlightBoxesLoading,
    onSelectedHighlightBoxChange,
    setActiveBoxIds,
  };
}
