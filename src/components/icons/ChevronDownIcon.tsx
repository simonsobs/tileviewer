import { CSSProperties } from 'react';

type Props = {
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
};

export function ChevronDownIcon({ width = 14, height = 14 }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-chevron-down-icon lucide-chevron-down"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
