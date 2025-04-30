import { useState, useCallback, FormEvent } from 'react';
import { NewBoxData } from '../types/maps';
import { MapProps } from './OpenLayersMap';
import { Dialog } from './Dialog';
import { addSubmapAsBox } from '../utils/fetchUtils';

type AddBoxDialogProps = {
  showAddBoxDialog: boolean;
  setShowAddBoxDialog: (showDialog: boolean) => void;
  newBoxData?: NewBoxData;
  setBoxes: MapProps['setBoxes'];
  setActiveBoxIds: MapProps['setActiveBoxIds'];
  addOptimisticHighlightBox: MapProps['addOptimisticHighlightBox'];
  handleAddBoxCleanup: () => void;
};

export function AddBoxDialog({
  showAddBoxDialog,
  setShowAddBoxDialog,
  newBoxData,
  setBoxes,
  setActiveBoxIds,
  addOptimisticHighlightBox,
  handleAddBoxCleanup,
}: AddBoxDialogProps) {
  const [boxName, setBoxName] = useState('');
  const [boxDescription, setBoxDescription] = useState('');

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      const formData = new FormData(e.target as HTMLFormElement);
      const params = new URLSearchParams();

      formData.forEach((val, key) => {
        params.append(key, val.toString());
      });

      if (!newBoxData) return;

      const { top_left_ra, top_left_dec, bottom_right_ra, bottom_right_dec } =
        newBoxData;

      const top_left = [top_left_ra, top_left_dec];
      const bottom_right = [bottom_right_ra, bottom_right_dec];

      const boxData = {
        params,
        top_left,
        bottom_right,
      };

      addSubmapAsBox(
        boxData,
        setBoxes,
        setActiveBoxIds,
        addOptimisticHighlightBox
      );

      // Reset applicable state after adding a new submap box
      setBoxName('');
      setBoxDescription('');
      setShowAddBoxDialog(false);
      handleAddBoxCleanup();
    },
    [
      newBoxData,
      handleAddBoxCleanup,
      setShowAddBoxDialog,
      addOptimisticHighlightBox,
      setActiveBoxIds,
      setBoxes,
    ]
  );

  return (
    <Dialog
      dialogKey="add-box-dialog"
      openDialog={showAddBoxDialog}
      setOpenDialog={setShowAddBoxDialog}
      headerText="Add New Box Layer"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(e);
        }}
      >
        <label>
          Name
          <input
            name="name"
            type="text"
            value={boxName}
            onChange={(e) => setBoxName(e.target.value)}
            required
          />
        </label>
        <label>
          Description
          <textarea
            name="description"
            value={boxDescription}
            onChange={(e) => setBoxDescription(e.target.value)}
          />
        </label>
        <input type="submit" value="Add Box" />
      </form>
    </Dialog>
  );
}
