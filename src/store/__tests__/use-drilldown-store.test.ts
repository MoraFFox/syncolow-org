import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDrillDownStore } from '../use-drilldown-store';

describe('useDrillDownStore', () => {
  beforeEach(() => {
    useDrillDownStore.setState({
      isOpen: false,
      kind: null,
      payload: null,
      preview: { isOpen: false, kind: null, payload: null },
      history: [],
      compareMode: false,
      compareItems: [],
    });
  });

  it('should initialize with default state', () => {
    const state = useDrillDownStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.kind).toBeNull();
    expect(state.payload).toBeNull();
    expect(state.preview.isOpen).toBe(false);
    expect(state.history).toEqual([]);
    expect(state.compareMode).toBe(false);
  });

  it('should open drill dialog', () => {
    useDrillDownStore.getState().openDialog('company', { id: '123' });
    const state = useDrillDownStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.kind).toBe('company');
    expect(state.payload).toEqual({ id: '123' });
  });

  it('should close drill dialog', () => {
    useDrillDownStore.getState().openDialog('company', { id: '123' });
    useDrillDownStore.getState().closeDialog();
    const state = useDrillDownStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.kind).toBeNull();
    expect(state.payload).toBeNull();
  });

  it('should show preview', () => {
    useDrillDownStore.getState().showPreview('order', { id: '456' }, { x: 100, y: 100 });
    const state = useDrillDownStore.getState();
    expect(state.preview).toEqual({
      isOpen: true,
      kind: 'order',
      payload: { id: '456' },
      coords: { x: 100, y: 100 }
    });
  });

  it('should hide preview', () => {
    useDrillDownStore.getState().showPreview('order', { id: '456' }, { x: 100, y: 100 });
    useDrillDownStore.getState().hidePreview();
    const state = useDrillDownStore.getState();
    expect(state.preview.isOpen).toBe(false);
    expect(state.preview.kind).toBeNull();
  });

  it('should toggle compare mode', () => {
    expect(useDrillDownStore.getState().compareMode).toBe(false);
    useDrillDownStore.getState().toggleCompareMode();
    expect(useDrillDownStore.getState().compareMode).toBe(true);
    useDrillDownStore.getState().toggleCompareMode();
    expect(useDrillDownStore.getState().compareMode).toBe(false);
  });
});
