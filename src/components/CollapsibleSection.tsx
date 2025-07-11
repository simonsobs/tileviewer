import { ReactNode } from 'react';

type Props = {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen: boolean;
};

export function CollapsibleSection({ summary, defaultOpen, children }: Props) {
  return (
    <details open={defaultOpen}>
      <summary>{summary}</summary>
      {children}
    </details>
  );
}
