import { renderAgentPromptTemplate } from "src/cursor/renderAgentPromptTemplate"

/**
 * Prompt used when the agent target is Claude Code.
 *
 * The Cursor template tells the agent to load the ticket through this
 * extension's embedded MCP, which only the Cursor agent has. A Claude Code
 * session reaches Linear through the official Linear MCP (`mcp.linear.app`),
 * so the loading step is worded for those tools instead.
 *
 * The template is written in pt-BR on purpose: this fork's owner works in
 * Portuguese and the pasted prompt is user-visible text.
 */
export const DEFAULT_CLAUDE_ISSUE_PROMPT_TEMPLATE = [
  "Execute a issue {{issueIdentifier}} do Linear neste workspace.",
  "",
  "Passo 1, carregar o ticket pelo MCP do Linear (não me peça para colar nada):",
  "- `get_issue` da {{issueIdentifier}}",
  "- `list_comments` da {{issueIdentifier}} (discussão e esclarecimentos)",
  "- siga as issues referenciadas quando mudarem o escopo",
  "",
  "Passo 2, extrair desse contexto o objetivo, o critério de aceite, as restrições e as áreas afetadas.",
  "",
  "Passo 3, implementar:",
  "- A menor mudança correta que cumpre o ticket",
  "- Seguindo as convenções que já existem neste repositório",
  "- Respeitando as regras do CLAUDE.md, inclusive as de não tocar",
  "",
  "Passo 4, verificar antes de reportar: rode o build ou os testes do projeto e confira o critério de aceite item a item contra a saída real, não contra a intenção.",
  "",
  "Se algo crítico estiver ambíguo, declare a premissa adotada e continue.",
  "",
  "Ao terminar, resuma o que mudou, como isso responde ao ticket e o que foi verificado.",
  "",
  "Responda em português (pt-BR).",
].join("\n")

export function buildClaudeIssuePrompt(
  issueIdentifier: string,
  options?: { template?: string },
): string {
  const identifier = issueIdentifier.trim()
  if (!identifier) {
    throw new Error("Issue identifier is required to start work with the agent.")
  }

  const template = options?.template?.trim() || DEFAULT_CLAUDE_ISSUE_PROMPT_TEMPLATE

  return renderAgentPromptTemplate(template, {
    issueIdentifier: identifier,
  })
}
