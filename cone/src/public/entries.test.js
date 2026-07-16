import { describe, test, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const entryDirs = readdirSync(__dirname).filter((name) => {
  const path = join(__dirname, name)
  return statSync(path).isDirectory() && statSync(join(path, 'main.jsx'), { throwIfNoEntry: false })
})

describe('public entry main.jsx files load fonts.js', () => {
  test.each(entryDirs)('%s/main.jsx imports fonts.js', (dir) => {
    const source = readFileSync(join(__dirname, dir, 'main.jsx'), 'utf-8')
    expect(source).toMatch(/['"]\.\.\/\.\.\/fonts\.js['"]/)
  })
})
