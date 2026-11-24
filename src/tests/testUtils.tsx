import { act, ReactNode } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach } from 'vitest';

/**
 * Registers hooks that give each test a fresh React root attached to the document.
 * Call it at the top level of a test file that uses `// @vitest-environment jsdom`.
 */
export function setUpTestRoot() {
  let container: HTMLDivElement;
  let root: Root;

  beforeAll(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  return {
    /** The element the current test renders into */
    container: () => container,
    render: (ui: ReactNode) => act(() => root.render(ui)),
  };
}

/** jsdom doesn't implement modal dialogs, so stand in for the methods Dialog uses */
export function polyfillDialog() {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
}

/** Finds the input inside the label whose text starts with the given text */
export function inputByLabel(scope: Element, text: string) {
  const label = [...scope.querySelectorAll('label')].find((l) =>
    l.textContent?.trim().startsWith(text)
  );
  if (!label) throw new Error(`No label starting with "${text}"`);
  return label.querySelector('input')!;
}

/** Sets an input's value the way a user typing would, so that React's onChange fires */
export function type(input: HTMLInputElement, value: string) {
  const setValue = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value'
  )!.set!;
  act(() => {
    setValue.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

export const click = (el: HTMLElement) => act(() => el.click());
