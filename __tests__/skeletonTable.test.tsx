import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SkeletonTable from '../src/components/shared/SkeletonTable';

describe('SkeletonTable', () => {
  it('renders the specified number of rows', () => {
    const { container } = render(<SkeletonTable rows={3} cols={4} />);
    const rows = container.querySelectorAll('tr');
    expect(rows.length).toBe(3);
  });

  it('renders the specified number of columns per row', () => {
    const { container } = render(<SkeletonTable rows={2} cols={5} />);
    const firstRow = container.querySelector('tr');
    const cells = firstRow?.querySelectorAll('td');
    expect(cells?.length).toBe(5);
  });

  it('renders skeleton loaders', () => {
    const { container } = render(<SkeletonTable rows={1} cols={3} />);
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBe(3);
  });

  it('renders circular skeleton for first column', () => {
    const { container } = render(<SkeletonTable rows={1} cols={3} />);
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons[0]).toHaveStyle({ width: '44px' });
  });
});
