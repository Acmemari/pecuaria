import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SubscriptionPage from '../../../components/SubscriptionPage';
import { User } from '../../../types';

const mockUser: User = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'client',
  plan: 'basic',
};

describe('SubscriptionPage', () => {
  const mockOnUpgrade = vi.fn();
  const mockOnBack = vi.fn();

  it('should render all plans', () => {
    render(
      <SubscriptionPage
        user={mockUser}
        onUpgrade={mockOnUpgrade}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('Básico')).toBeInTheDocument();
    expect(screen.getByText('Profissional')).toBeInTheDocument();
    expect(screen.getByText('Enterprise')).toBeInTheDocument();
  });

  it('should highlight current plan', () => {
    render(
      <SubscriptionPage
        user={mockUser}
        onUpgrade={mockOnUpgrade}
        onBack={mockOnBack}
      />
    );

    // Check that "Plano Atual" appears for basic plan
    const basicPlanSection = screen.getByText('Básico').closest('div');
    expect(basicPlanSection).toBeInTheDocument();
    // The plan should be marked as current
    expect(screen.getByText('Plano Atual')).toBeInTheDocument();
  });

  it('should show plan prices', () => {
    render(
      <SubscriptionPage
        user={mockUser}
        onUpgrade={mockOnUpgrade}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText(/R\$ 0/)).toBeInTheDocument();
    expect(screen.getByText(/R\$ 97/)).toBeInTheDocument();
    expect(screen.getByText(/R\$ 299/)).toBeInTheDocument();
  });

  it('should show "Plano Atual" for current plan', () => {
    render(
      <SubscriptionPage
        user={mockUser}
        onUpgrade={mockOnUpgrade}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('Plano Atual')).toBeInTheDocument();
  });
});

