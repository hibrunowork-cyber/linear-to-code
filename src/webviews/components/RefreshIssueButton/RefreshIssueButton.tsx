import cx from "classnames"
import { useIssueContext } from "src/webviews/contexts/IssueContext"

import { Button } from "../Button/Button"
import { AlertIcon } from "../Icons/AlertIcon"
import { ResetIcon } from "../Icons/ResetIcon"

import "./RefreshIssueButton.scss"

export type RefreshIssueButtonProps = {
  size?: number
  className?: string
  style?: React.CSSProperties
}

/**
 * Reloads the open issue on demand.
 *
 * The panel has no live connection to Linear, so an agent session, the Linear
 * app or a teammate can move the issue while it sits open here. The context
 * polls for that and flags it; this button is where the flag is shown and
 * where the reload happens.
 */
export function RefreshIssueButton(props: RefreshIssueButtonProps) {
  const { size = 14, className, style } = props

  const { issueSync } = useIssueContext()
  const { isStale, isRefreshing, refresh } = issueSync

  return (
    <Button
      style={style}
      className={cx("refreshIssueButton", isStale && "refreshIssueButtonStale", className)}
      onClick={() => refresh()}
      loading={isRefreshing}
      tooltip={
        isStale
          ? "This issue changed in Linear. Refresh to load the latest version."
          : "Refresh issue"
      }
      icon={
        <span className="refreshIssueButtonIcon">
          <ResetIcon size={size} />
          {isStale && (
            <AlertIcon className="refreshIssueButtonBadge" size={Math.round(size * 0.7)} />
          )}
        </span>
      }
    />
  )
}
