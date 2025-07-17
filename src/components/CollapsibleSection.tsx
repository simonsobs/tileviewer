import { ReactNode } from 'react';

type Props = {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen: boolean;
  tooltip?: string;
};

export function CollapsibleSection({
  summary,
  defaultOpen,
  children,
  tooltip,
}: Props) {
  return (
    <details open={defaultOpen}>
      <summary title={tooltip}>{summary}</summary>
      {children}
    </details>
  );
}
