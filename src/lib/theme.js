export function getTheme() {
  return document.documentElement.getAttribute('data-theme') ?? 'dark'
}

export function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('sq-theme', theme)
}

export function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark')
}
