import { useRef, useEffect, ReactNode } from 'react';

type DialogProps = {
  dialogKey: string;
  openDialog: boolean;
  closeDialog: () => void;
  headerText?: string;
  children: ReactNode;
};

export function Dialog({
  dialogKey,
  openDialog,
  closeDialog,
  headerText,
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialogRef = ref.current;
    if (openDialog) {
      dialogRef?.showModal();
    } else {
      dialogRef?.close();
    }

    return () => dialogRef?.close();
  }, [openDialog]);

  return (
    <dialog key={dialogKey} ref={ref} onCancel={closeDialog}>
      <header>
        {headerText && <h1>{headerText}</h1>}
        <button className="close-dialog" title="Close" onClick={closeDialog}>
          &#9747;
        </button>
      </header>
      {children}
    </dialog>
  );
}
