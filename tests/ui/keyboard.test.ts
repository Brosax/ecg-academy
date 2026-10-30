import { toChildArray, type JSX, type VNode } from 'preact';
import { describe, expect, it, vi } from 'vitest';
import { Segmented, Tabs } from '../../src/ui';

type ButtonNode = VNode<JSX.ButtonHTMLAttributes<HTMLButtonElement>>;
const values = ['one', 'two', 'three'];

function control(kind: 'tabs' | 'radios', value = 'two') {
  const onChange = vi.fn();
  const render = (selected: string) => {
    const tree = kind === 'tabs'
      ? Tabs({ value: selected, tabs: values.map((id) => ({ id, label: id })), onChange, ariaLabel: 'Sections' })
      : Segmented({ value: selected, options: values.map((v) => ({ value: v, label: v })), onChange, ariaLabel: 'Choice' });
    return toChildArray(tree.props.children) as ButtonNode[];
  };
  const buttons = render(value);
  // The Node suite exercises actual rendered handlers with a minimal focus target, not a browser DOM.
  const targets = values.map(() => ({ focus: vi.fn() }));
  const parentElement = { querySelectorAll: vi.fn(() => targets) };
  function key(index: number, key: string, modifiers: Partial<KeyboardEvent> = {}) {
    const event = {
      key,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      currentTarget: { parentElement },
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      ...modifiers,
    };
    const handler = buttons[index].props.onKeyDown;
    expect(handler).toBeTypeOf('function');
    handler?.(event as unknown as JSX.TargetedKeyboardEvent<HTMLButtonElement>);
    return event;
  }
  return { buttons, targets, onChange, key, render };
}

describe.each(['tabs', 'radios'] as const)('%s keyboard navigation', (kind) => {
  it('has one Tab stop, on the selected option', () => {
    expect(control(kind).buttons.map((b) => b.props.tabIndex)).toEqual([-1, 0, -1]);
  });

  it('remains reachable when no option is selected', () => {
    expect(control(kind, '').buttons.map((b) => b.props.tabIndex)).toEqual([0, -1, -1]);
  });

  it.each([
    ['ArrowRight', 1, 2],
    ['ArrowLeft', 1, 0],
    ['ArrowRight', 2, 0],
    ['ArrowLeft', 0, 2],
    ['Home', 1, 0],
    ['End', 1, 2],
  ] as const)('%s from option %i focuses and selects option %i', (key, from, to) => {
    const c = control(kind, values[from]);
    const e = c.key(from, key);
    expect(c.targets[to].focus).toHaveBeenCalledOnce();
    expect(c.onChange).toHaveBeenCalledExactlyOnceWith(values[to]);
    expect(e.preventDefault).toHaveBeenCalledOnce();
    expect(e.stopPropagation).toHaveBeenCalledOnce();
    const updated = c.render(values[to]);
    expect(updated.map((b) => b.props.tabIndex)).toEqual(values.map((_, i) => i === to ? 0 : -1));
    const selectedAttribute = kind === 'tabs' ? 'aria-selected' : 'aria-checked';
    expect(updated.map((b) => b.props[selectedAttribute])).toEqual(values.map((_, i) => i === to));
  });

  it.each(['Tab', 'Enter', ' ', 'Escape'])('leaves %s to native button/browser behavior', (key) => {
    const c = control(kind);
    const e = c.key(1, key);
    expect(c.onChange).not.toHaveBeenCalled();
    expect(e.preventDefault).not.toHaveBeenCalled();
    expect(e.stopPropagation).not.toHaveBeenCalled();
    c.targets.forEach((t) => expect(t.focus).not.toHaveBeenCalled());
  });

  it.each(['altKey', 'ctrlKey', 'metaKey'] as const)('does not intercept shortcuts with %s', (modifier) => {
    const c = control(kind);
    const e = c.key(1, 'ArrowLeft', { [modifier]: true });
    expect(c.onChange).not.toHaveBeenCalled();
    expect(e.preventDefault).not.toHaveBeenCalled();
  });

  it.each(['ArrowDown', 'ArrowUp'])('handles %s only in radio groups', (key) => {
    const c = control(kind);
    const e = c.key(1, key);
    if (kind === 'radios') {
      const next = key === 'ArrowDown' ? 2 : 0;
      expect(c.onChange).toHaveBeenCalledExactlyOnceWith(values[next]);
      expect(c.targets[next].focus).toHaveBeenCalledOnce();
      expect(e.preventDefault).toHaveBeenCalledOnce();
    } else {
      expect(c.onChange).not.toHaveBeenCalled();
      expect(e.preventDefault).not.toHaveBeenCalled();
    }
  });
});
