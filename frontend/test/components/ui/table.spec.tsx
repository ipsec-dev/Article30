import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from '@/components/ui/table';

describe('<Table /> shadcn primitives', () => {
  it('renders a full table tree with the expected data-slot tags', () => {
    const { container } = render(
      <Table className="t">
        <TableCaption className="cap">Title</TableCaption>
        <TableHeader className="hdr">
          <TableRow className="r1">
            <TableHead className="h1">A</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="bdy">
          <TableRow>
            <TableCell className="c1">1</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter className="ftr">
          <TableRow>
            <TableCell>x</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );

    expect(container.querySelector('[data-slot="table-container"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="table"]')?.classList.contains('t')).toBe(true);
    expect(container.querySelector('[data-slot="table-header"]')?.classList.contains('hdr')).toBe(
      true,
    );
    expect(container.querySelector('[data-slot="table-body"]')?.classList.contains('bdy')).toBe(
      true,
    );
    expect(container.querySelector('[data-slot="table-footer"]')?.classList.contains('ftr')).toBe(
      true,
    );
    expect(container.querySelector('[data-slot="table-head"]')?.textContent).toBe('A');
    expect(container.querySelector('[data-slot="table-cell"]')?.textContent).toBe('1');
    expect(container.querySelector('[data-slot="table-caption"]')?.textContent).toBe('Title');
    expect(container.querySelector('[data-slot="table-row"]')).not.toBeNull();
  });
});
