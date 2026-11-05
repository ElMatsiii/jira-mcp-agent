/**
 * Mock helper for GoogleGenerativeAI SDK
 */

export function createMockGenerativeModel(mockResponse: any) {
  return {
    generateContent: jest.fn().mockResolvedValue({
      response: {
        text: () => (typeof mockResponse === 'string' ? mockResponse : JSON.stringify(mockResponse)),
      },
    }),
  };
}

export function createFailingGenerativeModel(error: Error) {
  return {
    generateContent: jest.fn().mockRejectedValue(error),
  };
}
