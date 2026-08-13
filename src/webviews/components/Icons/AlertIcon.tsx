type AlertIconProps = {
  style?: React.CSSProperties
  className?: string
  size?: number
}

export function AlertIcon(props: AlertIconProps) {
  const { style, className, size = 16 } = props

  return (
    <svg
      className={className}
      width={size}
      height={size}
      style={style}
      fill="currentColor"
      fillRule="evenodd"
      role="img"
      focusable="false"
      aria-hidden="true"
      viewBox="0 0 640 640"
    >
      {/* Triangle with the bar and the dot punched out by the even-odd rule. */}
      <path d="M320 72c-13 0-25 7-31 19L26 540c-13 24 4 52 31 52h526c27 0 44-28 31-52L351 91c-6-12-18-19-31-19zM292 232h56v168h-56zM320 448a34 34 0 1 1 0 68 34 34 0 0 1 0-68z" />
    </svg>
  )
}
