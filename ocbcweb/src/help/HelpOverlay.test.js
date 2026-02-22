import React from 'react';
import { render, screen, act } from '@testing-library/react';
import HelpOverlay from './HelpOverlay';

afterEach(() => {
  document.body.innerHTML = '';
});

test('advances to the next step when chatbot tutorial progress matches intent', async () => {
  document.body.innerHTML = `
    <div id="step-0"></div>
    <div id="step-1"></div>
    <div id="step-2"></div>
  `;

  const steps = [
    {
      target: '#step-0',
      text: 'Open the chatbot.'
    },
    {
      target: '#step-1',
      text: 'Ask for your balance.',
      intentKey: 'check_balance'
    },
    {
      target: '#step-2',
      text: 'Great job!'
    }
  ];

  render(
    <HelpOverlay
      steps={steps}
      title="AI Chatbot"
      onClose={jest.fn()}
      onNavigate={jest.fn()}
    />
  );

  expect(screen.getByText('Open the chatbot.')).toBeInTheDocument();

  act(() => {
    window.dispatchEvent(
      new CustomEvent('chatbot:tutorial-progress', {
        detail: { intent: 'check_balance' }
      })
    );
  });

  expect(await screen.findByText('Great job!')).toBeInTheDocument();
});
