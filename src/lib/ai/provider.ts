import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

/**
 * Model selection for the Baker Copilot.
 *
 * Whichever API key is present wins, OpenAI first. Keys are read lazily so a
 * missing key surfaces as a clear error on the first chat request instead of
 * crashing the whole admin build at import time.
 */

export type CopilotProviderName = "openai" | "anthropic";

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_ANTHROPIC_MODEL = "claude-3-5-sonnet-latest";

export class MissingAiCredentialsError extends Error {
  constructor() {
    super(
      "No AI provider configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY."
    );
    this.name = "MissingAiCredentialsError";
  }
}

export function getConfiguredProvider(): CopilotProviderName | null {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

/**
 * Resolves the chat model. Model ids are overridable via env so switching to a
 * stronger model for quoting work does not require a code change.
 */
export function getCopilotModel(): LanguageModel {
  const provider = getConfiguredProvider();

  if (provider === "openai") {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai(process.env.COPILOT_OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL);
  }

  if (provider === "anthropic") {
    const anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    return anthropic(
      process.env.COPILOT_ANTHROPIC_MODEL ?? DEFAULT_ANTHROPIC_MODEL
    );
  }

  throw new MissingAiCredentialsError();
}
