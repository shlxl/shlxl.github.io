export interface ParsedFrontmatter {
  block: string
  raw: string
  body: string
  hasFrontmatter: boolean
  filePath?: string
}

export function readFrontmatterFile(filePath: string): ParsedFrontmatter
export function parseFrontmatterContent(content: string): ParsedFrontmatter
export function extractFrontmatterBlockFile(filePath: string): string
export function extractFrontmatterBlockFromContent(content: string): string
export function parseFrontmatterArray(block: string, key: string): string[]
export function parseFrontmatterBoolean(block: string, key: string): boolean | undefined
export function parseFrontmatterString(block: string, key: string): string
export function parseFrontmatterDate(block: string, key: string): number
export function frontmatterToObject(block: string): Record<string, unknown>

declare const _default: {
  readFrontmatterFile: typeof readFrontmatterFile
  parseFrontmatterContent: typeof parseFrontmatterContent
  extractFrontmatterBlockFile: typeof extractFrontmatterBlockFile
  extractFrontmatterBlockFromContent: typeof extractFrontmatterBlockFromContent
  parseFrontmatterArray: typeof parseFrontmatterArray
  parseFrontmatterBoolean: typeof parseFrontmatterBoolean
  parseFrontmatterString: typeof parseFrontmatterString
  parseFrontmatterDate: typeof parseFrontmatterDate
  frontmatterToObject: typeof frontmatterToObject
}

export default _default
