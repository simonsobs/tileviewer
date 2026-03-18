import './styles/loading-overlay.css';

export function Spinner({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-label="Loading"
      className={`spinner`}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      {/* Track */}
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.2"
      />
      {/* Arc */}
      <path
        d="M8 2a6 6 0 0 1 6 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LoadingOverlay({ isLoading = false }) {
  return (
    <div className={'loading-overlay ' + (isLoading ? 'loading' : 'loaded')}>
      <Spinner size={32} />
    </div>
  );
}
