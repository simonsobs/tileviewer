import './styles/toggle-switch.css';

type ToggleSwitchProps = {
  checked: boolean;
  onChange: () => void;
  disabled: boolean;
  disabledMessage: string;
};

export function ToggleSwitch({
  checked,
  onChange,
  disabled,
  disabledMessage,
}: ToggleSwitchProps) {
  return (
    <div
      className={'toggle-container' + (disabled ? ' disabled' : '')}
      title={disabled ? disabledMessage : undefined}
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
