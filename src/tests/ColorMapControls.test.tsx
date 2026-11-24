// @vitest-environment jsdom
import { act, useReducer } from 'react';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { ColorMapControls } from '../components/ColorMapControls';
import {
  BaselayersAction,
  baselayersReducer,
} from '../reducers/baselayersReducer';
import { BaselayersState, InternalBaselayer } from '../types/layers';
import { makeLayer, makeState } from './baselayerFixtures';
import {
  click,
  inputByLabel,
  polyfillDialog,
  setUpTestRoot,
  type,
} from './testUtils';

// The histogram and slider aren't under test here and rely on layout APIs jsdom doesn't have
vi.mock('../components/ColorMapHistogram', () => ({
  ColorMapHistogram: () => null,
}));
vi.mock('../components/ColorMapSlider', () => ({
  ColorMapSlider: () => null,
}));

const testRoot = setUpTestRoot();
/** The reducer state after the latest render */
let state: BaselayersState;
/** Every action dispatched by the component, in order */
let dispatched: BaselayersAction[];

/** Renders ColorMapControls against the real reducer, the same way App does */
function Harness({ initialState }: { initialState: BaselayersState }) {
  const [current, dispatch] = useReducer(baselayersReducer, initialState);
  state = current;
  return (
    <ColorMapControls
      activeBaselayer={current.activeBaselayer as InternalBaselayer}
      dispatchBaselayersChange={(action) => {
        dispatched.push(action);
        dispatch(action);
      }}
      syncedCmapValuesByType={current.syncedCmapValuesByType}
      histogramData={current.histogramData!}
    />
  );
}

function render(initialState: BaselayersState) {
  testRoot.render(<Harness initialState={initialState} />);
}

beforeAll(polyfillDialog);

beforeEach(() => {
  dispatched = [];
});

const panel = () => testRoot.container().querySelector('.cmap-controls-pane')!;
const dialog = () => testRoot.container().querySelector('dialog');

const submitButton = () =>
  dialog()!.querySelector<HTMLInputElement>('input[type="submit"]')!;

function openDialog() {
  click(
    testRoot.container().querySelector<HTMLButtonElement>('.dialog-popout-btn')!
  );
}

function setDialogValues(min: string, max: string) {
  // Set max first so the min input's max attribute never blocks submission
  type(inputByLabel(dialog()!, 'Maximum'), max);
  type(inputByLabel(dialog()!, 'Minimum'), min);
}

const linkedLayers = () => [
  makeLayer('a'),
  makeLayer('b', { cmap: 'gray' }),
  makeLayer('c', { units: 'K' }),
];

describe('panel controls', () => {
  test('Log, Abs. and Link toggles update state', () => {
    render(makeState(linkedLayers().map((l) => ({ ...l, vmin: 10 }))));

    click(inputByLabel(panel(), 'Log'));
    expect(state.activeBaselayer).toMatchObject({ isLogScale: true });

    click(inputByLabel(panel(), 'Abs.'));
    expect(state.activeBaselayer).toMatchObject({ isAbsoluteValue: true });

    click(inputByLabel(panel(), 'Link'));
    expect(inputByLabel(panel(), 'Link').checked).toBe(true);
    expect(state.internalBaselayers?.get('b')).toMatchObject({
      isLogScale: true,
      isAbsoluteValue: true,
    });
  });

  test('Log is disabled with a title when vmin is not positive in linear scale', () => {
    render(makeState([makeLayer('a', { vmin: 0 })]));
    const log = inputByLabel(panel(), 'Log');
    expect(log.disabled).toBe(true);
    expect(log.closest('label')!.title).toBe(
      'Log scale requires a positive vmin'
    );
  });

  test('Log can be turned off when the log-scale vmin is not positive', () => {
    // A log vmin of -1 is a linear vmin of 0.1
    render(
      makeState([makeLayer('a', { vmin: -1, vmax: 2, isLogScale: true })])
    );
    const log = inputByLabel(panel(), 'Log');
    expect(log.disabled).toBe(false);

    click(log);
    expect(state.activeBaselayer).toMatchObject({ isLogScale: false });
    expect((state.activeBaselayer as { vmin: number }).vmin).toBeCloseTo(0.1);
  });
});

describe('dialog: normal use', () => {
  test('opens with the current settings, showing log values as linear', () => {
    render(
      makeState([
        makeLayer('a', { cmap: 'plasma', vmin: 1, vmax: 3, isLogScale: true }),
      ])
    );
    openDialog();
    expect(dialog()!.open).toBe(true);
    expect(inputByLabel(dialog()!, 'Specify').value).toBe('plasma');
    expect(Number(inputByLabel(dialog()!, 'Minimum').value)).toBeCloseTo(10);
    expect(Number(inputByLabel(dialog()!, 'Maximum').value)).toBeCloseTo(1000);
    expect(inputByLabel(dialog()!, 'Log Scale').checked).toBe(true);
    expect(submitButton().disabled).toBe(false);
    expect(submitButton().title).toBe('Apply these settings to the map');
  });

  test('applies every edited setting in one submit and closes', () => {
    render(makeState([makeLayer('a')]));
    openDialog();
    type(inputByLabel(dialog()!, 'Specify'), 'plasma');
    setDialogValues('10', '1000');
    click(inputByLabel(dialog()!, 'Log Scale'));
    click(inputByLabel(dialog()!, 'Abs. Value'));
    click(submitButton());

    expect(state.activeBaselayer).toMatchObject({
      cmap: 'plasma',
      vmin: 1,
      vmax: 3,
      isLogScale: true,
      isAbsoluteValue: true,
    });
    expect(dialog()).toBeNull();
  });

  test('a new cmap name is added to the panel select', () => {
    render(makeState([makeLayer('a')]));
    openDialog();
    type(inputByLabel(dialog()!, 'Specify'), 'my_custom_cmap');
    click(submitButton());

    const options = [...panel().querySelectorAll('option')].map((o) => o.value);
    expect(options).toContain('my_custom_cmap');
  });

  test('linking with edits applies the edits to every layer of the same type', () => {
    render(makeState(linkedLayers()));
    openDialog();
    click(inputByLabel(dialog()!, 'Link'));
    type(inputByLabel(dialog()!, 'Specify'), 'plasma');
    setDialogValues('-5', '5');
    click(submitButton());

    // The link is toggled before any other change so the changes get synced
    expect(dispatched[0].type).toBe('CHANGE_SYNC_CMAP_VALUES');
    const expected = { cmap: 'plasma', vmin: -5, vmax: 5 };
    expect(state.internalBaselayers?.get('a')).toMatchObject(expected);
    expect(state.internalBaselayers?.get('b')).toMatchObject(expected);
    expect(state.internalBaselayers?.get('c')).toMatchObject({
      cmap: 'viridis',
      vmin: -100,
    });
  });

  test('unlinking with edits only applies the edits to the active layer', () => {
    render(makeState(linkedLayers(), ['uK-T']));
    openDialog();
    expect(inputByLabel(dialog()!, 'Link').checked).toBe(true);
    click(inputByLabel(dialog()!, 'Link'));
    type(inputByLabel(dialog()!, 'Specify'), 'plasma');
    click(submitButton());

    expect(state.syncedCmapValuesByType?.has('uK-T')).toBe(false);
    expect(state.activeBaselayer).toMatchObject({ cmap: 'plasma' });
    expect(state.internalBaselayers?.get('b')).toMatchObject({ cmap: 'gray' });
  });
});

describe('dialog: edge cases', () => {
  test.each([
    { scale: 'linear', layer: makeLayer('a') },
    {
      scale: 'log',
      layer: makeLayer('a', { vmin: 0.3, vmax: 2.3, isLogScale: true }),
    },
  ])(
    'submitting without edits in $scale scale dispatches nothing',
    ({ layer }) => {
      render(makeState([layer]));
      openDialog();
      click(submitButton());
      expect(dispatched).toEqual([]);
      expect(dialog()).toBeNull();
    }
  );

  test('switching log to linear keeps a newly entered negative minimum', () => {
    render(makeState([makeLayer('a', { vmin: 1, vmax: 2, isLogScale: true })]));
    openDialog();
    click(inputByLabel(dialog()!, 'Log Scale'));
    setDialogValues('-5', '1000');
    click(submitButton());
    expect(state.activeBaselayer).toMatchObject({
      isLogScale: false,
      vmin: -5,
      vmax: 1000,
    });
  });

  test('switching linear to log with positive, unedited values converts them', () => {
    render(makeState([makeLayer('a', { vmin: 10, vmax: 1000 })]));
    openDialog();
    click(inputByLabel(dialog()!, 'Log Scale'));
    click(submitButton());
    expect(state.activeBaselayer).toMatchObject({
      isLogScale: true,
      vmin: 1,
      vmax: 3,
    });
  });

  test.each([
    {
      how: 'the close button',
      dismiss: () =>
        click(dialog()!.querySelector<HTMLButtonElement>('.close-dialog')!),
    },
    {
      how: 'Escape',
      dismiss: () =>
        act(() => {
          dialog()!.dispatchEvent(new Event('cancel'));
        }),
    },
  ])('dismissing with $how discards unsubmitted edits', ({ dismiss }) => {
    render(makeState([makeLayer('a')]));
    openDialog();
    type(inputByLabel(dialog()!, 'Specify'), 'plasma');
    setDialogValues('1', '2');
    click(inputByLabel(dialog()!, 'Log Scale'));
    click(inputByLabel(dialog()!, 'Abs. Value'));
    click(inputByLabel(dialog()!, 'Link'));
    dismiss();

    expect(dialog()).toBeNull();
    expect(dispatched).toEqual([]);

    openDialog();
    expect(inputByLabel(dialog()!, 'Specify').value).toBe('viridis');
    expect(inputByLabel(dialog()!, 'Minimum').value).toBe('-100');
    expect(inputByLabel(dialog()!, 'Maximum').value).toBe('100');
    expect(inputByLabel(dialog()!, 'Log Scale').checked).toBe(false);
    expect(inputByLabel(dialog()!, 'Abs. Value').checked).toBe(false);
    expect(inputByLabel(dialog()!, 'Link').checked).toBe(false);
  });

  test('reopening reflects changes made in the panel since it was last open', () => {
    render(makeState([makeLayer('a')]));
    openDialog();
    click(dialog()!.querySelector<HTMLButtonElement>('.close-dialog')!);

    click(inputByLabel(panel(), 'Link'));
    click(inputByLabel(panel(), 'Abs.'));
    openDialog();
    expect(inputByLabel(dialog()!, 'Link').checked).toBe(true);
    expect(inputByLabel(dialog()!, 'Abs. Value').checked).toBe(true);
    expect(inputByLabel(dialog()!, 'Minimum').value).toBe('0');
  });
});

describe('dialog: invalid use', () => {
  const LOG_ERROR = 'Log scale requires positive minimum and maximum values';
  const EMPTY_ERROR = 'Enter both a minimum and maximum value';

  test.each([
    { case: 'ticking Log with a negative minimum', min: '-100', max: '100' },
    { case: 'ticking Log with a zero minimum', min: '0', max: '100' },
    { case: 'ticking Log with a negative maximum', min: '-100', max: '-1' },
  ])('$case disables submission with a title', ({ min, max }) => {
    render(makeState([makeLayer('a')]));
    openDialog();
    setDialogValues(min, max);
    click(inputByLabel(dialog()!, 'Log Scale'));
    expect(submitButton().disabled).toBe(true);
    expect(submitButton().title).toBe(LOG_ERROR);
  });

  test('entering a non-positive minimum while in log scale disables submission', () => {
    render(makeState([makeLayer('a', { vmin: 1, vmax: 2, isLogScale: true })]));
    openDialog();
    type(inputByLabel(dialog()!, 'Minimum'), '-1');
    expect(submitButton().disabled).toBe(true);
    expect(submitButton().title).toBe(LOG_ERROR);
  });

  test.each(['Minimum', 'Maximum'])(
    'clearing the %s value disables submission with a title',
    (field) => {
      render(makeState([makeLayer('a')]));
      openDialog();
      type(inputByLabel(dialog()!, field), '');
      expect(submitButton().disabled).toBe(true);
      expect(submitButton().title).toBe(EMPTY_ERROR);
    }
  );

  test('fixing the invalid setting re-enables submission', () => {
    render(makeState([makeLayer('a')]));
    openDialog();
    click(inputByLabel(dialog()!, 'Log Scale'));
    expect(submitButton().disabled).toBe(true);

    click(inputByLabel(dialog()!, 'Log Scale'));
    expect(submitButton().disabled).toBe(false);

    click(inputByLabel(dialog()!, 'Log Scale'));
    setDialogValues('1', '100');
    expect(submitButton().disabled).toBe(false);
  });

  test('submitting the form another way (e.g. Enter) while invalid does nothing', () => {
    render(makeState([makeLayer('a')]));
    openDialog();
    click(inputByLabel(dialog()!, 'Log Scale'));
    act(() => {
      dialog()!
        .querySelector('form')!
        .dispatchEvent(
          new Event('submit', { bubbles: true, cancelable: true })
        );
    });
    expect(dispatched).toEqual([]);
    expect(dialog()!.open).toBe(true);
  });
});
