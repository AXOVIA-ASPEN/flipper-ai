/**
 * @jest-environment jsdom
 *
 * Unit tests for Onboarding wizard components.
 * Author: ASPEN
 * Company: Axovia AI
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import WizardLayout from '@/components/Onboarding/WizardLayout';
import StepWelcome from '@/components/Onboarding/StepWelcome';
import StepMarketplaces, { MARKETPLACES } from '@/components/Onboarding/StepMarketplaces';
import StepCategories, { CATEGORIES } from '@/components/Onboarding/StepCategories';
import StepBudget, { BUDGET_RANGES } from '@/components/Onboarding/StepBudget';
import StepLocation from '@/components/Onboarding/StepLocation';
import StepComplete from '@/components/Onboarding/StepComplete';

// ─── WizardLayout ────────────────────────────────────────────────────────────

describe('WizardLayout', () => {
  const defaultProps = {
    currentStep: 2,
    totalSteps: 6,
    title: 'Test Step',
    children: <div>Content</div>,
  };

  it('renders step counter and title', () => {
    render(<WizardLayout {...defaultProps} />);
    expect(screen.getByText('Step 2 of 6')).toBeInTheDocument();
    expect(screen.getByText('Test Step')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders progress bar with correct percentage', () => {
    render(<WizardLayout {...defaultProps} />);
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '33');
  });

  it('calls onNext when Continue is clicked', () => {
    const onNext = jest.fn();
    render(<WizardLayout {...defaultProps} onNext={onNext} />);
    fireEvent.click(screen.getByText('Continue'));
    expect(onNext).toHaveBeenCalled();
  });

  it('calls onBack when Back is clicked', () => {
    const onBack = jest.fn();
    render(<WizardLayout {...defaultProps} onBack={onBack} showBack={true} />);
    fireEvent.click(screen.getByText('← Back'));
    expect(onBack).toHaveBeenCalled();
  });

  it('calls onSkip when Skip is clicked', () => {
    const onSkip = jest.fn();
    render(<WizardLayout {...defaultProps} onSkip={onSkip} />);
    fireEvent.click(screen.getByText('Skip setup'));
    expect(onSkip).toHaveBeenCalled();
  });

  it('disables Next button when nextDisabled=true', () => {
    const onNext = jest.fn();
    render(<WizardLayout {...defaultProps} onNext={onNext} nextDisabled={true} />);
    const btn = screen.getByText('Continue');
    expect(btn).toBeDisabled();
  });

  it('shows custom nextLabel', () => {
    render(<WizardLayout {...defaultProps} onNext={() => {}} nextLabel="Finish" />);
    expect(screen.getByText('Finish')).toBeInTheDocument();
  });
});

// ─── StepWelcome ─────────────────────────────────────────────────────────────

describe('StepWelcome', () => {
  it('renders welcome message without name', () => {
    render(<StepWelcome />);
    expect(screen.getByText(/Welcome!/)).toBeInTheDocument();
  });

  it('renders welcome message with name', () => {
    render(<StepWelcome name="Alice" />);
    expect(screen.getByText(/Welcome, Alice!/)).toBeInTheDocument();
  });

  it('renders feature highlights', () => {
    render(<StepWelcome />);
    expect(screen.getByText('Scan marketplaces')).toBeInTheDocument();
    expect(screen.getByText('AI-powered insights')).toBeInTheDocument();
    expect(screen.getByText('Track profits')).toBeInTheDocument();
  });
});

// ─── StepMarketplaces ────────────────────────────────────────────────────────

describe('StepMarketplaces', () => {
  it('renders all marketplace options', () => {
    render(<StepMarketplaces selected={[]} onChange={() => {}} />);
    MARKETPLACES.forEach(({ label }) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('calls onChange with selected marketplace', () => {
    const onChange = jest.fn();
    render(<StepMarketplaces selected={[]} onChange={onChange} />);
    fireEvent.click(screen.getByText('eBay'));
    expect(onChange).toHaveBeenCalledWith(['ebay']);
  });

  it('calls onChange removing deselected marketplace', () => {
    const onChange = jest.fn();
    render(<StepMarketplaces selected={['ebay', 'mercari']} onChange={onChange} />);
    fireEvent.click(screen.getByText('eBay'));
    expect(onChange).toHaveBeenCalledWith(['mercari']);
  });

  it('shows warning when nothing is selected', () => {
    render(<StepMarketplaces selected={[]} onChange={() => {}} />);
    expect(screen.getByText(/select at least one/i)).toBeInTheDocument();
  });

  it('does not show warning when something is selected', () => {
    render(<StepMarketplaces selected={['ebay']} onChange={() => {}} />);
    expect(screen.queryByText(/select at least one/i)).not.toBeInTheDocument();
  });
});

// ─── StepCategories ──────────────────────────────────────────────────────────

describe('StepCategories', () => {
  it('renders all category options', () => {
    render(<StepCategories selected={[]} onChange={() => {}} />);
    CATEGORIES.forEach(({ label }) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('calls onChange when a category is clicked', () => {
    const onChange = jest.fn();
    render(<StepCategories selected={[]} onChange={onChange} />);
    fireEvent.click(screen.getByText('Electronics'));
    expect(onChange).toHaveBeenCalledWith(['electronics']);
  });

  it('removes category on second click', () => {
    const onChange = jest.fn();
    render(<StepCategories selected={['electronics']} onChange={onChange} />);
    fireEvent.click(screen.getByText('Electronics'));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});

// ─── StepBudget ──────────────────────────────────────────────────────────────

describe('StepBudget', () => {
  it('renders all budget options', () => {
    render(<StepBudget selected="small" onChange={() => {}} />);
    BUDGET_RANGES.forEach(({ label }) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('highlights selected budget', () => {
    render(<StepBudget selected="medium" onChange={() => {}} />);
    const radio = screen.getByLabelText('Medium ($200–$500)');
    expect(radio).toBeChecked();
  });

  it('calls onChange when budget is clicked', () => {
    const onChange = jest.fn();
    render(<StepBudget selected="small" onChange={onChange} />);
    fireEvent.click(screen.getByText('Large ($500–$2,000)'));
    expect(onChange).toHaveBeenCalledWith('large');
  });
});

// ─── StepLocation ────────────────────────────────────────────────────────────

describe('StepLocation', () => {
  it('renders ZIP input and radius buttons', () => {
    render(
      <StepLocation zip="" radius={25} onZipChange={() => {}} onRadiusChange={() => {}} />
    );
    expect(screen.getByLabelText('ZIP code')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '25 mi' })).toBeInTheDocument();
  });

  it('calls onZipChange with numeric-only input', () => {
    const onZipChange = jest.fn();
    render(
      <StepLocation zip="" radius={25} onZipChange={onZipChange} onRadiusChange={() => {}} />
    );
    fireEvent.change(screen.getByLabelText('ZIP code'), { target: { value: '9021A' } });
    expect(onZipChange).toHaveBeenCalledWith('9021');
  });

  it('calls onRadiusChange when radius button clicked', () => {
    const onRadiusChange = jest.fn();
    render(
      <StepLocation zip="" radius={25} onZipChange={() => {}} onRadiusChange={onRadiusChange} />
    );
    fireEvent.click(screen.getByRole('button', { name: '50 mi' }));
    expect(onRadiusChange).toHaveBeenCalledWith(50);
  });

  it('marks selected radius as pressed', () => {
    render(
      <StepLocation zip="" radius={100} onZipChange={() => {}} onRadiusChange={() => {}} />
    );
    expect(screen.getByRole('button', { name: '100 mi' })).toHaveAttribute('aria-pressed', 'true');
  });
});

// ─── StepComplete ────────────────────────────────────────────────────────────

describe('StepComplete', () => {
  it('renders success message', () => {
    render(<StepComplete onGoToDashboard={() => {}} />);
    expect(screen.getByText(/You're all set!/i)).toBeInTheDocument();
  });

  it('calls onGoToDashboard when button is clicked', () => {
    const onGoToDashboard = jest.fn();
    render(<StepComplete onGoToDashboard={onGoToDashboard} />);
    fireEvent.click(screen.getByText('Go to Dashboard →'));
    expect(onGoToDashboard).toHaveBeenCalled();
  });

  it('renders link to settings', () => {
    render(<StepComplete onGoToDashboard={() => {}} />);
    expect(screen.getByText('Adjust settings later')).toBeInTheDocument();
  });
});
