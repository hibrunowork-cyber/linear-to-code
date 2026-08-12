import { commands, env, window } from "vscode"

/**
 * Send a prompt to the Claude Code panel (extension `anthropic.claude-code`).
 *
 * Same mechanic the Cursor Composer path uses: the prompt travels on the
 * clipboard, the panel is opened, and the paste command drops it into the
 * input. The clipboard is restored afterwards.
 *
 * Unlike the Composer path this works in any VS Code fork, since it only
 * depends on the Claude Code extension being installed.
 */

// Ordered by preference: a fresh conversation keeps the ticket prompt from
// landing in the middle of an unrelated session.
const CLAUDE_OPEN_COMMANDS = [
  "claude-vscode.newConversation",
  "claude-vscode.sidebar.open",
  "claude-vscode.editor.openLast",
  "claude-vscode.editor.open",
] as const

const CLAUDE_FOCUS_COMMAND = "claude-vscode.focus"
const PASTE_COMMAND = "editor.action.clipboardPasteAction"
const UI_READY_DELAY_MS = 600

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function isClaudeCodeAvailable(): Promise<boolean> {
  const available = new Set(await commands.getCommands(true))
  return CLAUDE_OPEN_COMMANDS.some((command) => available.has(command))
}

export async function openClaudeCodeWithPrompt(prompt: string): Promise<void> {
  const trimmedPrompt = prompt.trim()
  if (!trimmedPrompt) {
    throw new Error("Prompt is required to open Claude Code.")
  }

  const available = new Set(await commands.getCommands(true))
  const openCommand = CLAUDE_OPEN_COMMANDS.find((command) => available.has(command))

  if (!openCommand) {
    throw new Error(
      "Claude Code extension not found. Install `anthropic.claude-code` or set `linearToCode.agentTarget` to `cursor`.",
    )
  }

  let previousClipboard: string | undefined
  try {
    previousClipboard = await env.clipboard.readText()
  } catch {
    previousClipboard = undefined
  }

  try {
    await env.clipboard.writeText(trimmedPrompt)
    await commands.executeCommand(openCommand)
    await sleep(UI_READY_DELAY_MS)

    if (available.has(CLAUDE_FOCUS_COMMAND)) {
      try {
        await commands.executeCommand(CLAUDE_FOCUS_COMMAND)
      } catch {
        // Focus is best effort: the paste below may still land.
      }
    }

    try {
      await commands.executeCommand(PASTE_COMMAND)
    } catch {
      void window.showInformationMessage(
        "Claude Code opened. The prompt is on your clipboard, paste it with Cmd+V.",
      )
      return
    }
  } finally {
    if (previousClipboard !== undefined) {
      try {
        await env.clipboard.writeText(previousClipboard)
      } catch {
        // Keep the prompt on the clipboard when restore fails.
      }
    }
  }
}
