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
  "Passo 3, preparar o git antes de tocar em código:",
  "- `git status --short` e `git branch --show-current` primeiro. Mudança pendente que não é desta issue = outra sessão trabalhando aqui: não use stash nem troque de branch nesta árvore; abra um worktree próprio (`git worktree add <dir-fora-do-repo> -b <branch-da-issue> origin/main`) e trabalhe nele",
  "- A branch da issue nasce de `origin/main` atualizado (`git fetch origin main` antes de criar), nunca do HEAD de outra issue",
  "- Use o nome de branch que o `get_issue` sugere (gitBranchName)",
  "- Commite cedo e rode `git push -u origin <branch>` logo após o primeiro commit, e `git push` depois de cada commit seguinte. Commit sem push é cópia única nesta máquina",
  "",
  "Passo 4, implementar:",
  "- A menor mudança correta que cumpre o ticket",
  "- Seguindo as convenções que já existem neste repositório",
  "- Respeitando as regras do CLAUDE.md, inclusive as de não tocar",
  "",
  "Passo 5, verificar antes de reportar: rode o build ou os testes do projeto e confira o critério de aceite item a item contra a saída real, não contra a intenção.",
  "",
  "Passo 6, atualizar a issue no Linear antes de encerrar (obrigatório, mesmo se a tarefa não terminou):",
  "- SEMPRE comentar: `save_comment` na {{issueIdentifier}} com o que foi feito, o que foi verificado e o que ficou pendente",
  "- Quando o aceite de código fechar, abra a PR para a main (`gh pr create`) e traga o link no comentário; o merge fica com o Bruno, e a integração fecha a issue quando ele mergear",
  "- Se o aceite tiver itens que não são de código (avisar alguém, configurar ambiente, testar em produção), liste-os no comentário e NÃO marque Done: eles continuam abertos depois do merge",
  "- Mover o status com `save_issue` quando o trabalho mudou de estágio: In Progress ao começar, In Review quando a entrega precisa de revisão ou saiu PR, Done só com o critério de aceite verificado de verdade",
  "- Confira os status reais do time com `list_issue_statuses` antes de mover, os nomes variam",
  "- Se parou por bloqueio ou dúvida, comente o bloqueio e o que falta, e deixe o status onde está",
  "",
  "Se algo crítico estiver ambíguo, declare a premissa adotada e continue.",
  "",
  "Ao terminar, resuma para mim o que mudou, como isso responde ao ticket e o que foi verificado.",
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
