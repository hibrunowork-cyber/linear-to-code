import { commands, env, window, workspace } from "vscode"

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
const UI_READY_DELAY_MS = 600

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function isClaudeCodeAvailable(): Promise<boolean> {
  const available = new Set(await commands.getCommands(true))
  return CLAUDE_OPEN_COMMANDS.some((command) => available.has(command))
}

export async function openClaudeCodeWithPrompt(prompt: string, label: string): Promise<void> {
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

  // The prompt stays on the clipboard on purpose. The panel is a webview and
  // `editor.action.clipboardPasteAction` only reaches text editors, so the
  // paste has to come from the user's keyboard; restoring the clipboard here
  // would leave them with nothing to paste.
  await env.clipboard.writeText(trimmedPrompt)
  await commands.executeCommand(openCommand)
  await sleep(UI_READY_DELAY_MS)

  if (available.has(CLAUDE_FOCUS_COMMAND)) {
    try {
      await commands.executeCommand(CLAUDE_FOCUS_COMMAND)
    } catch {
      // Focus is best effort.
    }
  }

  void window.showInformationMessage(`${label} prompt copied. Paste it in Claude Code with Cmd+V.`)
}

// Single quotes keep the newlines; the only character to escape is the quote.
function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

function buildClaudeCommand(prompt: string): string {
  const config = workspace.getConfiguration("linearToCode")
  const model = (config.get<string>("claudeModel") ?? "").trim()
  const fastMode = config.get<boolean>("claudeFastMode") ?? false

  const permissionMode = (config.get<string>("claudePermissionMode") ?? "").trim()

  const args: string[] = []
  if (model) {
    args.push("--model", shellQuote(model))
  }
  if (permissionMode) {
    args.push("--permission-mode", shellQuote(permissionMode))
  }
  // Fast mode has no CLI flag: it lives in settings.json. `--settings` adds a
  // layer on top of the user's settings instead of replacing them, so the
  // session keeps its permissions, hooks and MCP servers.
  if (fastMode) {
    args.push("--settings", shellQuote(`{"fastMode":true}`))
  }
  args.push(shellQuote(prompt))

  return `claude ${args.join(" ")}`
}

/**
 * Fully automatic alternative: run the Claude Code CLI in an integrated
 * terminal with the prompt already as its argument. No paste involved, at the
 * cost of the session living in a terminal instead of the panel.
 */
export async function openClaudeTerminalWithPrompt(prompt: string, label: string): Promise<void> {
  const trimmedPrompt = prompt.trim()
  if (!trimmedPrompt) {
    throw new Error("Prompt is required to open Claude Code.")
  }

  const terminal = window.createTerminal({ name: `Claude · ${label}` })
  terminal.show()
  terminal.sendText(buildClaudeCommand(trimmedPrompt))
}
