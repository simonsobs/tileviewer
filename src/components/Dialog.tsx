import { useRef, useEffect, ReactNode } from 'react';

type DialogProps = {
  dialogKey: string;
  openDialog: boolean;
  setOpenDialog: (openDialog: boolean) => void;
  headerText?: string;
  children: ReactNode;
};

export function Dialog({
  dialogKey,
  openDialog,
  setOpenDialog,
  headerText,
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    if (openDialog) {
      ref.current?.showModal();
    } else {
      ref.current?.close();
    }

    return () => ref.current?.close();
  }, [openDialog]);

  return (
    <dialog key={dialogKey} ref={ref} onCancel={() => setOpenDialog(false)}>
      <header>
        {headerText && <h1>{headerText}</h1>}
        <button
          className="close-dialog"
          title="Close"
          onClick={() => setOpenDialog(false)}
        >
          &#9747;
        </button>
      </header>
      {children}
    </dialog>
  );
}
