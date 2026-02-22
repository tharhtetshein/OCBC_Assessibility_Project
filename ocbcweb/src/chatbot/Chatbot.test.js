import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Chatbot from './Chatbot';
import {
  getAdvancedChatbotSettings,
  getChatHistory,
  updateDailyTaskProgress
} from '../services/firebase';

jest.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ currentUser: { uid: 'user-123' } })
}));

jest.mock('../services/firebase', () => ({
  auth: { currentUser: { uid: 'user-123' } },
  updateDailyTaskProgress: jest.fn(),
  saveChatSession: jest.fn(),
  getChatHistory: jest.fn(),
  updateAdvancedChatbotSettings: jest.fn(),
  getAdvancedChatbotSettings: jest.fn()
}));

const mockSettings = {
  botName: 'Test Bot',
  simpleMode: false,
  language: 'english',
  familyMembers: [],
  safetyProfile: 'standard',
  speechSettings: {
    voiceInput: false,
    voiceOutput: false,
    voiceSpeed: 1,
    voicePitch: 1
  },
  memorySettings: {
    rememberPreferences: true,
    personalizedResponses: true,
    contextAwareness: true
  }
};

beforeEach(() => {
  getAdvancedChatbotSettings.mockResolvedValue({
    success: true,
    settings: mockSettings
  });
  getChatHistory.mockResolvedValue({ success: true, sessions: [] });
  updateDailyTaskProgress.mockResolvedValue({
    success: true,
    taskCompleted: false
  });
  global.fetch = jest.fn().mockResolvedValue({
    json: () => Promise.resolve({
      success: true,
      message: 'Your balance is $100.'
    })
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

test('shows welcome message using advanced settings bot name', async () => {
  render(<Chatbot onClose={jest.fn()} />);

  const welcome = await screen.findByText(/Hi! I'm Test Bot\./i);
  expect(welcome).toBeInTheDocument();
});

test('sends a message and emits tutorial progress for balance intent', async () => {
  const handler = jest.fn();
  window.addEventListener('chatbot:tutorial-progress', handler);

  const { container } = render(<Chatbot onClose={jest.fn()} />);

  const input = await screen.findByPlaceholderText('Type Here');
  fireEvent.change(input, { target: { value: "What's my balance?" } });
  await screen.findByDisplayValue("What's my balance?");

  const sendButton = container.querySelector('[data-help-id="chatbot-send"]');
  expect(sendButton).toBeTruthy();

  fireEvent.click(sendButton);

  expect(await screen.findByText('Your balance is $100.')).toBeInTheDocument();

  expect(handler).toHaveBeenCalled();
  expect(handler.mock.calls[0][0].detail.intent).toBe('check_balance');

  window.removeEventListener('chatbot:tutorial-progress', handler);
});
