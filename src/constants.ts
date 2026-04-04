export const DEFAULT_SPINNER_FRAMES = [
  '⠋',
  '⠙',
  '⠹',
  '⠸',
  '⠼',
  '⠴',
  '⠦',
  '⠧',
  '⠇',
  '⠏'
] as const

export const DEFAULT_MAX_LINES = 5
export const DEFAULT_SPINNER_INTERVAL = 100
export const LINE_SPLIT_REGEX = /\r\n|\n|\r/
export const HIDE_CURSOR_ESCAPE = '\u001B[?25l'
export const SHOW_CURSOR_ESCAPE = '\u001B[?25h'
