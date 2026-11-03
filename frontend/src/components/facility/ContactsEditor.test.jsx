import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContactsEditor from './ContactsEditor';
import { api } from '../../lib/api/client';

const facility = { id: 'f1', contact_name: 'Officer', contact_phone: '+254 700 000 102', address: null };

describe('ContactsEditor', () => {
  it('patches contacts and reports success', async () => {
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({ ...facility, contact_name: 'Night officer' });
    const onSaved = vi.fn();
    render(<ContactsEditor facility={facility} onSaved={onSaved} />);
    const name = screen.getByLabelText('Contact name');
    await userEvent.clear(name);
    await userEvent.type(name, 'Night officer');
    await userEvent.click(screen.getByRole('button', { name: /save contacts/i }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(patch).toHaveBeenCalledWith('/facilities/f1', { contact_name: 'Night officer', contact_phone: '+254 700 000 102', address: null });
    expect(screen.getByText(/Saved/)).toBeInTheDocument();
  });

  it('blocks a bad phone number before calling the API', async () => {
    const patch = vi.spyOn(api, 'patch');
    render(<ContactsEditor facility={facility} />);
    const phone = screen.getByLabelText('Contact phone');
    await userEvent.clear(phone);
    await userEvent.type(phone, 'call the desk');
    await userEvent.click(screen.getByRole('button', { name: /save contacts/i }));
    expect(await screen.findByText(/optional leading \+/)).toBeInTheDocument();
    expect(patch).not.toHaveBeenCalled();
  });
});
