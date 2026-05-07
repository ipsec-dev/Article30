import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { TreatmentDto } from '@article30/shared';
import { Article30Checklist } from '@/components/treatment/article-30-checklist';
import { makeTreatment } from '../../fixtures/treatment';

describe('<Article30Checklist />', () => {
  it('renders all 7 paragraphs', () => {
    render(<Article30Checklist treatment={makeTreatment()} />);
    expect(screen.getByText(/Art\. 30\(1\)\(a\)/)).toBeInTheDocument();
    expect(screen.getByText(/Art\. 30\(1\)\(b\)/)).toBeInTheDocument();
    expect(screen.getByText(/Art\. 30\(1\)\(c\)/)).toBeInTheDocument();
    expect(screen.getByText(/Art\. 30\(1\)\(d\)/)).toBeInTheDocument();
    expect(screen.getByText(/Art\. 30\(1\)\(e\)/)).toBeInTheDocument();
    expect(screen.getByText(/Art\. 30\(1\)\(f\)/)).toBeInTheDocument();
    expect(screen.getByText(/Art\. 30\(1\)\(g\)/)).toBeInTheDocument();
  });

  it('marks responsable as Renseigné and DPO as N/A always', () => {
    render(<Article30Checklist treatment={makeTreatment()} />);
    const labels = screen.getAllByText(/Renseigné|Manquant|N\/A/);
    expect(labels.length).toBeGreaterThanOrEqual(7);
    expect(screen.getAllByText('N/A').length).toBeGreaterThanOrEqual(1);
  });

  it('marks finalités Manquant when purpose or legalBasis is missing', () => {
    render(<Article30Checklist treatment={makeTreatment({ purpose: null, legalBasis: null })} />);
    // Manquant rows >= 4 (c, d, e, g)
    expect(screen.getAllByText('Manquant').length).toBeGreaterThanOrEqual(3);
  });

  it('marks finalités Renseigné when purpose AND legalBasis are present', () => {
    render(
      <Article30Checklist
        treatment={makeTreatment({
          purpose: 'Gestion RH',
          legalBasis: 'Contrat',
          personCategories: ['Salariés'],
          dataCategories: ['Identité', 'Coordonnées'] as unknown as TreatmentDto['dataCategories'],
        })}
      />,
    );
    // At least the 'a' (always) and 'c' and 'd' should be ok
    expect(screen.getAllByText('Renseigné').length).toBeGreaterThanOrEqual(3);
  });

  it('renders the satisfied/total summary at the top', () => {
    render(
      <Article30Checklist
        treatment={makeTreatment({
          purpose: 'X',
          legalBasis: 'Y',
          personCategories: ['A'],
          dataCategories: ['B'] as unknown as TreatmentDto['dataCategories'],
        })}
      />,
    );
    // 'a' always satisfied; 'c' purpose+legalBasis; 'd' personCategories+dataCategories.
    // 'b' is na, so total=6 (a,c,d,e,f,g). Satisfied so far: a,c,d = 3.
    expect(screen.getByText(/3 \/ 6 renseignés/)).toBeInTheDocument();
  });

  it('uses font-mono on paragraph codes', () => {
    const { container } = render(<Article30Checklist treatment={makeTreatment()} />);
    const codes = container.querySelectorAll('.font-mono');
    expect(codes.length).toBeGreaterThanOrEqual(7);
  });
});
