/// <reference types="vite/client" />

// Declare CSS module imports for TypeScript
declare module '*.css' {
  const content: Record<string, string>
  export default content
}

// Declare static asset imports
declare module '*.svg' {
  const src: string
  export default src
}

declare module '*.png' {
  const src: string
  export default src
}
