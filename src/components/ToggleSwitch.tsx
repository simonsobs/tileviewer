import './styles/toggle-switch.css';

type ToggleSwitchProps = {
  checked: boolean;
  onChange: () => void;
  disabled: boolean;
};

export function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: ToggleSwitchProps) {
  return (
    <div
      className="toggle-container"
      title={
        disabled ? 'You cannot switch to an incompatible RA range.' : undefined
      }
    >
      <input
        className="input"
        id="toggle"
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <label
        className={'label' + (disabled ? ' disabled' : '')}
        htmlFor="toggle"
      >
        <div className="left">-180 &lt; ra &lt; 180</div>
        <div className="switch">
          <span className="slider round"></span>
        </div>
        <div className="right">360 &lt; ra &lt; 0</div>
      </label>
    </div>
  );
}
