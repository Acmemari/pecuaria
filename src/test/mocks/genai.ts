import { vi } from 'vitest';

export const mockSendMessage = vi.fn().mockResolvedValue({
  text: 'Resposta mockada do Gemini',
});

export const mockChat = {
  sendMessage: mockSendMessage,
};

export const mockCreateChat = vi.fn(() => mockChat);

export const mockGoogleGenAI = {
  chats: {
    create: mockCreateChat,
  },
};

export const createMockGenAI = () => mockGoogleGenAI;

