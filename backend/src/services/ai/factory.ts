import { AIProvider } from './types.js';

/**
 * Create the default AI provider for the content pipeline.
 */
export async function createAIProvider(): Promise<AIProvider> {
  const { AnthropicProvider } = await import('./anthropic.js');
  return new AnthropicProvider();
}
