declare module '@sugarat/theme' {
  const Theme: any
  export default Theme
  export function getThemeConfig(...args: any[]): any
}

declare module '@sugarat/theme/node' {
  export function getThemeConfig(...args: any[]): any
}

declare module '*.vue' {
  const component: any
  export default component
}
