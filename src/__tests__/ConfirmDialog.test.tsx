import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ConfirmDialog from '../components/ui/ConfirmDialog';

describe('ConfirmDialog Component', () => {
  const mockProps = {
    isOpen: true,
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renders when open', () => {
    render(<ConfirmDialog {...mockProps} />);
    
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ConfirmDialog {...mockProps} isOpen={false} />);
    
    expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    render(<ConfirmDialog {...mockProps} />);
    
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    
    expect(mockProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<ConfirmDialog {...mockProps} />);
    
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    
    expect(mockProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('uses custom button labels when provided', () => {
    render(
      <ConfirmDialog 
        {...mockProps} 
        confirmText="Delete"
        cancelText="Keep"
      />
    );
    
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep' })).toBeInTheDocument();
  });
});
