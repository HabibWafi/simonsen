import { registerHooks } from 'node:module'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolve, dirname } from 'node:path'
import ts from 'typescript'

const root = resolve(import.meta.dirname, '..')
const stub = source => `data:text/javascript,${encodeURIComponent(source)}`
registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.includes('/node_modules/')) return next(specifier, context)
    let file
    if (specifier.startsWith('@/')) file = resolve(root, specifier.slice(2))
    else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) file = resolve(dirname(fileURLToPath(context.parentURL)), specifier)
    if (file) {
      for (const candidate of [file, `${file}.ts`, `${file}.tsx`]) {
        if (!existsSync(candidate)) continue
        if (candidate === resolve(root, 'lib/auth.ts')) return { url: stub('export async function auth() { return globalThis.securityTest.session }'), shortCircuit: true }
        if (candidate === resolve(root, 'lib/db.ts')) return { url: stub('export default { execute: (...args) => globalThis.securityTest.execute(...args), query: (...args) => globalThis.securityTest.execute(...args), getConnection: (...args) => globalThis.securityTest.getConnection(...args) }'), shortCircuit: true }
        return next(pathToFileURL(candidate).href, context)
      }
    }
    if (specifier === 'next/server') return next('next/server.js', context)
    return next(specifier, context)
  },
  load(url, context, next) {
    if (url.startsWith('file:') && /\.tsx?$/.test(url) && !url.includes('/node_modules/')) {
      const source = ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
      }).outputText
      return { format: 'module', source, shortCircuit: true }
    }
    return next(url, context)
  },
})
