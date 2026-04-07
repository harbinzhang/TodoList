import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SectionHeader from '../SectionHeader';
import { ConfirmationDialogProvider } from '../../../providers/ConfirmationDialogProvider';
import { ToastProvider } from '../../../providers/ToastProvider';
import { sectionService } from '../../../services/sectionService';

vi.mock('../../../services/sectionService', () => ({
  sectionService: {
    updateSection: vi.fn(),
    deleteSection: vi.fn(),
  },
}));

describe('SectionHeader confirmation flow', () => {
  it('opens the shared confirmation dialog before deleting', async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <ConfirmationDialogProvider>
          <SectionHeader
            sectionId="section-1"
            name="Roadmap"
            projectId="project-1"
            userId="user-1"
            completedCount={1}
            totalCount={3}
            isCollapsed={false}
            onToggleCollapse={vi.fn()}
          />
        </ConfirmationDialogProvider>
      </ToastProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Delete section Roadmap' }));

    expect(screen.getByText('Delete section "Roadmap"?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete section' }));

    expect(sectionService.deleteSection).toHaveBeenCalledWith('section-1', 'project-1', 'user-1');
  });
});
