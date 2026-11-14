/**
 * Mock helpers for the @google/genai client (`ai.models.generateContent` returning `{ text }`).
 */

export function createMockGenAIClient(mockResponse: any) {
  return {
    models: {
      generateContent: jest.fn().mockResolvedValue({
        text: typeof mockResponse === 'string' ? mockResponse : JSON.stringify(mockResponse),
      }),
    },
  };
}

export function createFailingGenAIClient(error: Error) {
  return {
    models: {
      generateContent: jest.fn().mockRejectedValue(error),
    },
  };
}
