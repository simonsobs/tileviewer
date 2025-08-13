import { ReactNode } from 'react';

type Props = {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen: boolean;
  tooltip?: string;
  nestedDepth?: number;
};

export function CollapsibleSection({
  summary,
  defaultOpen,
  children,
  tooltip,
  nestedDepth = 0,
}: Props) {
  return (
    <details style={{ marginLeft: nestedDepth * 5 }} open={defaultOpen}>
      <summary title={tooltip}>{summary}</summary>
      {children}
    </details>
  );
}
