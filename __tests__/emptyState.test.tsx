import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import EmptyState from '../src/components/shared/EmptyState';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState icon={<span />} title="No hay datos" />);
    expect(screen.getByText('No hay datos')).toBeInTheDocument();
  });

  it('renders search text when provided alongside title', () => {
    render(<EmptyState icon={<span />} title="No hay datos" search="Resultado de búsqueda vacío" />);
    expect(screen.getByText('No hay datos')).toBeInTheDocument();
    expect(screen.getByText('Resultado de búsqueda vacío')).toBeInTheDocument();
  });

  it('renders default text when no search provided', () => {
    render(<EmptyState icon={<span />} title="No hay datos" />);
    expect(screen.getByText('No hay información disponible para mostrar en este momento.')).toBeInTheDocument();
  });

  it('renders action button', () => {
    render(<EmptyState icon={<span />} title="No hay datos" action={<button>Agregar</button>} />);
    expect(screen.getByText('Agregar')).toBeInTheDocument();
  });
});
