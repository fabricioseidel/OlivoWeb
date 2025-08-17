import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Input from '../components/ui/Input';

describe('Input Component', () => {
  it('renders input with label', () => {
    render(
      <Input 
        id="test-input"
        label="Test Label"
        name="test"
        type="text"
        value=""
        onChange={() => {}}
      />
    );
    
    expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders input without label', () => {
    render(
      <Input 
        id="test-input"
        name="test"
        type="text"
        value=""
        onChange={() => {}}
      />
    );
    
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('displays error message when provided', () => {
    render(
      <Input 
        id="test-input"
        name="test"
        type="text"
        value=""
        onChange={() => {}}
        error="This field is required"
      />
    );
    
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('calls onChange when input value changes', () => {
    let value = '';
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      value = e.target.value;
    };

    render(
      <Input 
        id="test-input"
        name="test"
        type="text"
        value={value}
        onChange={handleChange}
      />
    );
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test value' } });
    
    expect(value).toBe('test value');
  });
});
