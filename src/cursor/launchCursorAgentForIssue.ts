import { Issue } from "@linear/sdk"
import { buildClaudeIssuePrompt } from "src/claudeCode/claudePrompt"
import { openClaudeCodeWithPrompt } from "src/claudeCode/openClaudeCode"
import { Controller } from "src/controller"
import { readAgentSettings } from "src/cursor/agentPromptSettings"
import { buildIssueAgentPrompt } from "src/cursor/buildIssueAgentPrompt"
import { ensureCursorEnvironment } from "src/cursor/detectCursorEnvironment"
import { openCursorAgentWithPrompt } from "src/cursor/openCursorAgent"
import { ExtensionContext, env, window, workspace } from "vscode"

// Which agent receives the ticket prompt. "cursor" keeps the upstream
// behaviour (Composer); "claude" sends it to the Claude Code panel, which
// works in any VS Code fork and runs on the user's Claude subscription.
function readAgentTarget(): "cursor" | "claude" {
  return workspace.getConfiguration("linearToCode").get<"cursor" | "claude">("agentTarget") ===
    "claude"
    ? "claude"
    : "cursor"
}

export async function launchCursorAgentForIssue(
  issue: Pick<Issue, "id" | "identifier">,
  context: ExtensionContext,
): Promise<void> {
  const target = readAgentTarget()

  if (target === "cursor" && !(await ensureCursorEnvironment())) {
    void window.showInformationMessage("Start work with agent is available in Cursor only.")
    return
  }

  let identifier = issue.identifier?.trim()
  if (!identifier) {
    const loadedIssue = await Controller.linearService.getIssue(issue.id)
    identifier = loadedIssue.identifier
  }

  if (target === "claude") {
    const prompt = buildClaudeIssuePrompt(identifier, { editorLanguageLocale: env.language })
    await openClaudeCodeWithPrompt(prompt)
    return
  }

  const agentSettings = readAgentSettings(context)
  const prompt = buildIssueAgentPrompt(identifier, agentSettings, {
    editorLanguageLocale: env.language,
  })
  await openCursorAgentWithPrompt(prompt)
}

export async function launchCursorAgentForIssueId(
  issueId: string,
  context: ExtensionContext,
): Promise<void> {
  const issue = await Controller.linearService.getIssue(issueId)
  await launchCursorAgentForIssue(issue, context)
}
