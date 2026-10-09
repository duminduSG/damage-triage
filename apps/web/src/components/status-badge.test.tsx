import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  it('labels claims that need a human', () => {
    render(<StatusBadge status="NEEDS_REVIEW" />);
    expect(screen.getByText('Needs review').dataset.status).toBe('NEEDS_REVIEW');
  });
});
