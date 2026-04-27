export const DEFAULT_AI_MODEL = "claude-sonnet-4-6";

export const AI_MODEL_OPTIONS = [
  {
    id: "claude-opus-4-7",
    label: "Claude Opus 4.7",
    provider: "Anthropic",
    description: "Highest-capability Claude model for complex reasoning and agentic coding.",
  },
  {
    id: "claude-opus-4-6",
    label: "Claude Opus 4.6",
    provider: "Anthropic",
    description: "Previous flagship Opus model.",
  },
  {
    id: "claude-opus-4-5-20251101",
    label: "Claude Opus 4.5",
    provider: "Anthropic",
    description: "Active Opus snapshot from November 2025.",
  },
  {
    id: "claude-opus-4-1-20250805",
    label: "Claude Opus 4.1",
    provider: "Anthropic",
    description: "Active Opus 4.1 snapshot.",
  },
  {
    id: "claude-opus-4-20250514",
    label: "Claude Opus 4",
    provider: "Anthropic",
    description: "Original Claude Opus 4 snapshot.",
  },
  {
    id: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    provider: "Anthropic",
    description: "Balanced default for speed, quality, and cost.",
  },
  {
    id: "claude-sonnet-4-5-20250929",
    label: "Claude Sonnet 4.5",
    provider: "Anthropic",
    description: "Active Sonnet 4.5 snapshot.",
  },
  {
    id: "claude-sonnet-4-20250514",
    label: "Claude Sonnet 4",
    provider: "Anthropic",
    description: "Original Claude Sonnet 4 snapshot.",
  },
  {
    id: "claude-3-7-sonnet-20250219",
    label: "Claude Sonnet 3.7",
    provider: "Anthropic",
    description: "Legacy Sonnet 3.7 snapshot.",
  },
  {
    id: "claude-haiku-4-5-20251001",
    label: "Claude Haiku 4.5",
    provider: "Anthropic",
    description: "Fastest current Claude model.",
  },
  {
    id: "claude-3-5-haiku-20241022",
    label: "Claude Haiku 3.5",
    provider: "Anthropic",
    description: "Legacy Haiku 3.5 snapshot.",
  },
  {
    id: "claude-3-haiku-20240307",
    label: "Claude Haiku 3",
    provider: "Anthropic",
    description: "Legacy Haiku 3 snapshot.",
  },
  {
    id: "deepseek-v4-pro",
    label: "DeepSeek V4 Pro",
    provider: "DeepSeek",
    description: "DeepSeek V4 flagship model with long context and thinking support.",
  },
  {
    id: "deepseek-v4-flash",
    label: "DeepSeek V4 Flash",
    provider: "DeepSeek",
    description: "Fast, economical DeepSeek V4 model.",
  },
] as const;

export type AiModelId = (typeof AI_MODEL_OPTIONS)[number]["id"];

export function getAiModelOption(modelId: string | undefined) {
  return AI_MODEL_OPTIONS.find((option) => option.id === modelId);
}
