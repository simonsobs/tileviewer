import { useOptimistic, useState, useTransition, useCallback } from 'react';
import { BaselayersState, InternalBaselayer } from '../types/layers';
import {
  BaselayersAction,
  assertInternalBaselayer,
  CHANGE_BASELAYER,
} from '../reducers/baselayersReducer';
import { EXTERNAL_BASELAYERS } from '../configs/mapConfigs';
import { mapApi } from '../api/client';

type BaselayerNavigation = {
  goBack: () => void;
  goForward: () => void;
  disableGoBack: boolean;
  disableGoForward: boolean;
};

export type BaselayerChangeHook = BaselayerNavigation & {
  changeBaselayer: (
    selectedBaselayerId: string,
    context: 'layerMenu' | 'goBack' | 'goForward',
    flipped: boolean | undefined,
    mergeSearchSelection?: (newActiveBaselayer: InternalBaselayer) => void
  ) => void;
  optimisticBaselayerId: string | undefined;
  isPending: boolean;
};

export function useBaselayerChange(
  baselayersState: BaselayersState,
  dispatchBaselayersChange: React.ActionDispatch<[action: BaselayersAction]>,
  flipTiles: boolean,
  setFlipTiles: (v: boolean) => void
): BaselayerChangeHook {
  const { activeBaselayer, internalBaselayers } = baselayersState;

  const [backHistoryStack, setBackHistoryStack] = useState<
    { id: string; flipped: boolean }[]
  >([]);
  const [forwardHistoryStack, setForwardHistoryStack] = useState<
    { id: string; flipped: boolean }[]
  >([]);

  const [optimisticBaselayerId, setOptimisticBaselayerId] = useOptimistic(
    activeBaselayer?.layer_id
  );
  const [isPending, startTransition] = useTransition();

  const changeBaselayer = useCallback(
    (
      selectedBaselayerId: string,
      context: 'layerMenu' | 'goBack' | 'goForward',
      flipped: boolean | undefined,
      mergeSearchSelection?: (newActiveBaselayer: InternalBaselayer) => void
    ) => {
      if (selectedBaselayerId === optimisticBaselayerId) return;

      // Update history stacks synchronously before the transition
      if (context === 'goBack') {
        setBackHistoryStack((prev) => prev.slice(0, -1));
        setForwardHistoryStack((prev) => [
          ...prev,
          { id: String(optimisticBaselayerId), flipped: flipTiles },
        ]);
      } else if (context === 'goForward') {
        setBackHistoryStack((prev) => [
          ...prev,
          { id: String(optimisticBaselayerId), flipped: flipTiles },
        ]);
        setForwardHistoryStack((prev) => prev.slice(0, -1));
      } else {
        setBackHistoryStack((prev) => [
          ...prev,
          { id: String(optimisticBaselayerId), flipped: flipTiles },
        ]);
        setForwardHistoryStack([]);
      }

      if (flipped !== undefined) setFlipTiles(flipped);

      startTransition(async () => {
        setOptimisticBaselayerId(selectedBaselayerId); // instant UI feedback
        let newActiveBaselayer = undefined;

        const isExternal = selectedBaselayerId.includes('external');

        if (isExternal) {
          newActiveBaselayer = EXTERNAL_BASELAYERS.find(
            (b) => b.layer_id === selectedBaselayerId
          );
        } else {
          newActiveBaselayer = await mapApi.getLayer(
            selectedBaselayerId,
            internalBaselayers
          );
        }

        if (!newActiveBaselayer) return;

        try {
          if (assertInternalBaselayer(newActiveBaselayer)) {
            const histogramData = await mapApi.getHistogramData(
              newActiveBaselayer.layer_id
            );
            dispatchBaselayersChange({
              type: CHANGE_BASELAYER,
              newBaselayer:
                newActiveBaselayer.vmin === undefined ||
                newActiveBaselayer.vmax === undefined
                  ? {
                      ...newActiveBaselayer,
                      vmin: histogramData.vmin,
                      vmax: histogramData.vmax,
                    }
                  : newActiveBaselayer,
              histogramData,
            });
            if (mergeSearchSelection) {
              mergeSearchSelection(newActiveBaselayer);
            }
          } else {
            dispatchBaselayersChange({
              type: CHANGE_BASELAYER,
              newBaselayer: newActiveBaselayer,
            });
          }
        } catch (err) {
          // optimisticBaselayerId auto-reverts to activeBaselayer?.layer_id on throw
          console.error('Failed to change baselayer:', err);
        }
      });
    },
    [
      optimisticBaselayerId,
      setOptimisticBaselayerId,
      internalBaselayers,
      flipTiles,
      setFlipTiles,
      dispatchBaselayersChange,
    ]
  );

  const goBack = useCallback(() => {
    const entry = backHistoryStack[backHistoryStack.length - 1];
    changeBaselayer(entry.id, 'goBack', entry.flipped);
  }, [changeBaselayer, backHistoryStack]);

  const goForward = useCallback(() => {
    const entry = forwardHistoryStack[forwardHistoryStack.length - 1];
    changeBaselayer(entry.id, 'goForward', entry.flipped);
  }, [changeBaselayer, forwardHistoryStack]);

  return {
    changeBaselayer,
    goBack,
    goForward,
    optimisticBaselayerId,
    isPending,
    disableGoBack: !backHistoryStack.length,
    disableGoForward: !forwardHistoryStack.length,
  };
}
