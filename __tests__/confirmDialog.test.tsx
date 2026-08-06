import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConfirmDialog from '../src/components/shared/ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    open: true,
    title: 'Eliminar elemento',
    message: '¿Está seguro?',
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };

  it('renders title and message', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText('Eliminar elemento')).toBeInTheDocument();
    expect(screen.getByText('¿Está seguro?')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('Confirmar'));
    expect(defaultProps.onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('uses custom button labels', () => {
    render(<ConfirmDialog {...defaultProps} confirmLabel="Sí" cancelLabel="No" />);
    expect(screen.getByText('Sí')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('shows error icon when confirmColor is error', () => {
    render(<ConfirmDialog {...defaultProps} confirmColor="error" />);
    expect(document.querySelector('[data-testid="ErrorOutlineOutlinedIcon"]')).toBeInTheDocument();
  });

  it('shows warning icon when confirmColor is warning', () => {
    render(<ConfirmDialog {...defaultProps} confirmColor="warning" />);
    expect(document.querySelector('[data-testid="WarningAmberIcon"]')).toBeInTheDocument();
  });
});
