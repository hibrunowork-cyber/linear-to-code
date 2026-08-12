import { renderAgentPromptTemplate } from "src/cursor/renderAgentPromptTemplate"
import { resolveEditorLanguage } from "src/cursor/resolveEditorLanguage"

/**
 * Prompt used when the agent target is Claude Code.
 *
 * The Cursor template tells the agent to load the ticket through this
 * extension's embedded MCP, which only the Cursor agent has. A Claude Code
 * session reaches Linear through the official Linear MCP (`mcp.linear.app`),
 * so the loading step is worded for those tools instead.
 */
export const DEFAULT_CLAUDE_ISSUE_PROMPT_TEMPLATE = [
  "Implement Linear issue {{issueIdentifier}} in this workspace.",
  "",
  "Step 1 — Load the ticket with the Linear MCP (do not ask me to paste it):",
  "- `get_issue` for {{issueIdentifier}}",
  "- `list_comments` for {{issueIdentifier}} (discussion and clarifications)",
  "- follow the issues it references when they change the scope",
  "",
  "Step 2 — From that context, identify the goal, acceptance criteria, constraints, and affected areas.",
  "",
  "Step 3 — Implement:",
  "- Make the smallest correct change that satisfies the ticket",
  "- Follow the conventions already in this repository",
  "- Respect the rules in CLAUDE.md, including the ones about what must not be touched",
  "",
  "Step 4 — Verify before reporting: run the project's build or tests, and check the acceptance criteria one by one against the real output, not against your intent.",
  "",
  "If something critical is ambiguous, state your assumption and continue.",
  "",
  "When finished, summarize what changed, how it maps to the ticket, and what you verified.",
  "",
  "Respond in {{editorLanguage}}.",
].join("\n")

export function buildClaudeIssuePrompt(
  issueIdentifier: string,
  options?: { editorLanguageLocale?: string; template?: string },
): string {
  const identifier = issueIdentifier.trim()
  if (!identifier) {
    throw new Error("Issue identifier is required to start work with the agent.")
  }

  const template = options?.template?.trim() || DEFAULT_CLAUDE_ISSUE_PROMPT_TEMPLATE

  return renderAgentPromptTemplate(template, {
    issueIdentifier: identifier,
    editorLanguage: resolveEditorLanguage(options?.editorLanguageLocale),
  })
}
