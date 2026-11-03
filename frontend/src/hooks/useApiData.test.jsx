import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { useApiData } from './useApiData';

function Probe({ loader }) {
  const { data, error, loading, reload } = useApiData(loader, []);
  return (
    <div>
      <span data-testid="out">{loading ? 'loading' : error ? `err:${error.message}` : JSON.stringify(data)}</span>
      <button onClick={reload}>reload</button>
    </div>
  );
}

describe('useApiData', () => {
  it('loads, errors and reloads', async () => {
    const loader = vi.fn().mockResolvedValueOnce([1]).mockRejectedValueOnce(new Error('boom')).mockResolvedValue([2]);
    render(<Probe loader={loader} />);
    await waitFor(() => expect(screen.getByTestId('out')).toHaveTextContent('[1]'));
    await act(async () => screen.getByText('reload').click());
    await waitFor(() => expect(screen.getByTestId('out')).toHaveTextContent('err:boom'));
    await act(async () => screen.getByText('reload').click());
    await waitFor(() => expect(screen.getByTestId('out')).toHaveTextContent('[2]'));
  });
});
