import { useState, useEffect, useOptimistic } from 'react';
import { Box } from '../types/maps';
import { fetchBoxes } from '../utils/fetchUtils';

type UseHighlightBoxesReturn = {
  highlightBoxes: Box[] | undefined;
  updateHighlightBoxes: React.Dispatch<React.SetStateAction<Box[] | undefined>>;
  optimisticHighlightBoxes: Box[] | undefined;
  addOptimisticHighlightBox: (action: Box) => void;
};

export function useHighlightBoxes(): UseHighlightBoxesReturn {
  // Represents the box regions users can add to maps
  const [highlightBoxes, updateHighlightBoxes] = useState<Box[] | undefined>(
    undefined
  );

  // Wrap highlightBoxes state in a useOptimistic hook so we can optimistically render new boxes
  const [optimisticHighlightBoxes, addOptimisticHighlightBox] = useOptimistic(
    highlightBoxes,
    (state, newHighlightBox: Box) => {
      if (state) {
        return [...state, newHighlightBox];
      } else {
        return [newHighlightBox];
      }
    }
  );

  useEffect(() => {
    // Fetch and set the highlightBoxes when app mounts
    async function getBoxes() {
      const boxes = await fetchBoxes();
      updateHighlightBoxes(boxes);
    }
    getBoxes();
  }, []);

  return {
    highlightBoxes,
    updateHighlightBoxes,
    optimisticHighlightBoxes,
    addOptimisticHighlightBox,
  };
}
