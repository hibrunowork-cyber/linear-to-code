import { Controller } from "src/controller"
import { ExtensionContext, Terminal, ViewColumn, window, workspace } from "vscode"

// Every Linear issue carries this prefix in its name (CLA-59, ENG-7), and the
// agent terminals this extension opens are named after it.
const ISSUE_IDENTIFIER_PATTERN = /\b([A-Z][A-Z0-9]{1,9}-\d+)\b/

// The terminal that triggered the lookup still in flight. Switching terminals
// mid-lookup must not open the issue of the one already left behind.
let pendingTerminal: Terminal | undefined

async function revealIssueForTerminal(terminal: Terminal | undefined) {
  if (!terminal) {
    return
  }

  const enabled = workspace.getConfiguration("linearToCode").get<boolean>("followTerminalIssue")
  if (enabled === false) {
    return
  }

  const identifier = terminal.name.match(ISSUE_IDENTIFIER_PATTERN)?.[1]
  if (!identifier) {
    return
  }

  pendingTerminal = terminal

  try {
    const issue = await Controller.linearService.getIssueByIdentifier(identifier)
    if (!issue || pendingTerminal !== terminal) {
      return
    }

    // The click landed on the terminal, so the terminal keeps the focus: the
    // panel is context here, not the thing being used.
    await Controller.issueViewer.openIssue(
      Controller.linearService.toTreeIssue(issue),
      ViewColumn.Active,
      { preserveFocus: true },
    )
    // And the sidebar follows along: the same issue gets selected in the
    // My Issues tree, still without stealing the terminal's focus.
    Controller.issueViewer.revealIssueInTree(identifier)
  } catch (error) {
    // Not authenticated, unknown identifier, dropped connection: none of it is
    // worth a popup on a click the user made for another reason.
    console.error(
      `[Linear to Code] Could not open the issue for terminal "${terminal.name}":`,
      error,
    )
  }
}

/**
 * Follows the focused terminal with its issue: selecting the terminal running
 * `CLA-59` reveals the CLA-59 panel in the editor area, so the work and the
 * ticket stay side by side without a trip to the sidebar.
 */
export function registerTerminalIssueFollow(context: ExtensionContext) {
  context.subscriptions.push(
    window.onDidChangeActiveTerminal((terminal) => void revealIssueForTerminal(terminal)),
  )
}

/**
 * The opposite direction: opening an issue switches the terminal pane to the
 * session working on it (`Claude · CLA-59`). preserveFocus, so the panel the
 * user opened keeps the cursor while the terminal shows the live session.
 * Returns whether a matching terminal was found.
 */
export function revealTerminalForIssue(identifier: string): boolean {
  const enabled = workspace
    .getConfiguration("linearToCode")
    .get<boolean>("revealTerminalOnIssueOpen")
  if (enabled === false) {
    return false
  }

  const wanted = identifier.trim().toUpperCase()
  if (!wanted) {
    return false
  }

  // Newest terminal wins: a relaunched issue creates a second `Claude · CLA-N`
  // and the stale one would otherwise shadow it forever.
  const match = [...window.terminals]
    .reverse()
    .find((t) => t.name.match(ISSUE_IDENTIFIER_PATTERN)?.[1]?.toUpperCase() === wanted)

  if (!match) {
    return false
  }

  match.show(true)
  return true
}
