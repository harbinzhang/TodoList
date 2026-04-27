import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useTreeContext } from '../TreeContext';

describe('useTreeContext', () => {
  it('throws when used outside a TreeContext.Provider', () => {
    expect(() => renderHook(() => useTreeContext())).toThrow(
      'useTreeContext must be used within TreeContext.Provider'
    );
  });
});
