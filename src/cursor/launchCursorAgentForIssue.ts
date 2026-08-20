import { Issue } from "@linear/sdk"
import { buildClaudeIssuePrompt } from "src/claudeCode/claudePrompt"
import {
  openClaudeCodeWithPrompt,
  openClaudeTerminalWithPrompt,
  resumeClaudeTerminal,
} from "src/claudeCode/openClaudeCode"
import { Controller } from "src/controller"
import { readAgentSettings } from "src/cursor/agentPromptSettings"
import { buildIssueAgentPrompt } from "src/cursor/buildIssueAgentPrompt"
import { ensureCursorEnvironment } from "src/cursor/detectCursorEnvironment"
import { openCursorAgentWithPrompt } from "src/cursor/openCursorAgent"
import { ExtensionContext, env, window, workspace } from "vscode"

// Which agent receives the ticket prompt. "cursor" keeps the upstream
// behaviour (Composer); "claude" sends it to the Claude Code panel, which
// works in any VS Code fork and runs on the user's Claude subscription.
type AgentTarget = "cursor" | "claude" | "claude-terminal"

function readAgentTarget(): AgentTarget {
  const value = workspace.getConfiguration("linearToCode").get<AgentTarget>("agentTarget")
  return value === "claude" || value === "claude-terminal" ? value : "cursor"
}

// The follow-up sent to a live session is the issue's latest comment — the
// flow this supports is "add a comment, hit play again". Falls back to a
// generic nudge when the issue has no comments.
async function buildFollowUpText(issueId: string, identifier: string): Promise<string> {
  try {
    const comments = await Controller.linearService.getComments(issueId)
    const latest = [...comments].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )[comments.length - 1]
    if (latest?.body?.trim()) {
      return `Atualização na ${identifier} — novo comentário: ${latest.body.trim()} — continue a partir disso.`
    }
  } catch {
    // Comment fetch is best effort; the generic nudge below still works.
  }
  return `A issue ${identifier} foi atualizada no Linear. Releia a issue e continue a partir das mudanças.`
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

  if (target === "claude" || target === "claude-terminal") {
    const prompt = buildClaudeIssuePrompt(identifier)
    if (target === "claude-terminal") {
      const followUp = await buildFollowUpText(issue.id, identifier)
      if (followUp && resumeClaudeTerminal(identifier, followUp)) {
        return
      }
      await openClaudeTerminalWithPrompt(prompt, identifier)
    } else {
      await openClaudeCodeWithPrompt(prompt, identifier)
    }
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
