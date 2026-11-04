import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ESLint } from 'eslint'

async function messages(rule, options, source, filePath = 'tests/fixtures/minimatch.tsx') {
  const eslint = new ESLint({ overrideConfig: [{ rules: { [rule]: ['error', ...options] } }] })
  const [result] = await eslint.lintText(source, { filePath })
  assert.equal(result.fatalErrorCount, 0, JSON.stringify(result.messages))
  return result.messages.filter(message => message.ruleId === rule)
}

test('the complete locked dependency graph uses minimatch 11.0.4', () => {
  const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'))
  const versions = Object.entries(lock.packages).filter(([path]) => /(^|\/)node_modules\/minimatch$/.test(path)).map(([, pkg]) => pkg.version)
  assert.ok(versions.length > 0)
  assert.deepEqual([...new Set(versions)], ['11.0.4'])
})

test('ESLint 10 evaluates file globs and ignores generated build output', async () => {
  const eslint = new ESLint()
  assert.equal(await eslint.isPathIgnored('.next/server/page.js'), true)
  assert.equal(await eslint.isPathIgnored('components/HeroLanding.tsx'), false)
})

test('React prop globs allow intended components and still flag forbidden props', async () => {
  const options = [{ forbid: [{ propNamePattern: 'data-*', allowedForPatterns: ['Allowed*'] }] }]
  assert.equal((await messages('react/forbid-component-props', options, 'const App = () => <AllowedBox data-test="a" />')).length, 0)
  assert.equal((await messages('react/forbid-component-props', options, 'const App = () => <OtherBox data-test="a" />')).length, 1)
})

test('React handler component globs retain both exemptions and diagnostics', async () => {
  const options = [{ ignoreComponentNames: ['Allowed*'], checkLocalVariables: true }]
  assert.equal((await messages('react/jsx-handler-names', options, 'const App = () => <AllowedBox onClick={badName} />')).length, 0)
  assert.equal((await messages('react/jsx-handler-names', options, 'const App = () => <OtherBox onClick={badName} />')).length, 1)
})

test('React PascalCase ignore globs match the selected component names', async () => {
  const code = 'const App = () => <Bad_name />'
  assert.equal((await messages('react/jsx-pascal-case', [{ ignore: ['Bad_*'] }], code)).length, 0)
  assert.equal((await messages('react/jsx-pascal-case', [{ ignore: ['Other_*'] }], code)).length, 1)
})

test('React dangerous HTML diagnostics still apply to custom component globs', async () => {
  const code = 'const App = () => <HtmlBox dangerouslySetInnerHTML={{__html: "text"}} />'
  assert.equal((await messages('react/no-danger', [{ customComponentNames: ['Other*'] }], code)).length, 0)
  assert.equal((await messages('react/no-danger', [{ customComponentNames: ['Html*'] }], code)).length, 1)
})

test('React render prop globs distinguish a render prop from a nested component', async () => {
  const code = 'function Parent() { return <Box bodyRenderer={() => <div />} /> }'
  assert.equal((await messages('react/no-unstable-nested-components', [{ propNamePattern: '*Renderer' }], code)).length, 0)
  assert.equal((await messages('react/no-unstable-nested-components', [{ propNamePattern: 'render*' }], code)).length, 1)
})

test('accessibility control globs recognize nested controls without accepting an empty label', async () => {
  const options = [{ controlComponents: ['Input*'], assert: 'nesting' }]
  assert.equal((await messages('jsx-a11y/label-has-associated-control', options, 'const App = () => <label>Nama<InputText /></label>')).length, 0)
  assert.equal((await messages('jsx-a11y/label-has-associated-control', options, 'const App = () => <label><InputText /></label>')).length, 1)
})

test('import extension path globs still exempt matching paths', async () => {
  const code = 'import { jadwalTimeline } from "./mockData"'
  const opts = pattern => ['always', { ignorePackages: false, pathGroupOverrides: [{ pattern, action: 'ignore' }] }]
  assert.equal((await messages('import/extensions', opts('./mock*'), code, 'lib/tahapan.ts')).length, 0)
  assert.equal((await messages('import/extensions', opts('./other*'), code, 'lib/tahapan.ts')).length, 1)
})

test('import module.exports exception globs preserve intended scope', async () => {
  const code = 'import React from "react"; module.exports = React'
  assert.equal((await messages('import/no-import-module-exports', [{ exceptions: ['**/tests/**'] }], code)).length, 0)
  assert.ok((await messages('import/no-import-module-exports', [{ exceptions: ['**/other/**'] }], code)).length > 0)
})

test('import development dependency globs permit tests and reject application imports', async () => {
  const code = 'import { ESLint } from "eslint"'
  const options = [{ devDependencies: ['**/tests/**'] }]
  assert.equal((await messages('import/no-extraneous-dependencies', options, code)).length, 0)
  assert.equal((await messages('import/no-extraneous-dependencies', options, code, 'app/lint-fixture.ts')).length, 1)
})

test('import namespace ignore globs preserve matching imports', async () => {
  const code = 'import * as React from "react"'
  assert.equal((await messages('import/no-namespace', [{ ignore: ['react*'] }], code)).length, 0)
  assert.equal((await messages('import/no-namespace', [{ ignore: ['other*'] }], code)).length, 1)
})

test('import side effect allow globs retain restrictions on other imports', async () => {
  const code = 'import "./theme.css"'
  assert.equal((await messages('import/no-unassigned-import', [{ allow: ['**/*.css'] }], code)).length, 0)
  assert.equal((await messages('import/no-unassigned-import', [{ allow: ['**/*.png'] }], code)).length, 1)
})

test('import order path group globs still enforce the configured ordering', async () => {
  const options = [{ groups: ['builtin', 'external'], pathGroups: [{ pattern: 'react*', group: 'builtin', position: 'before' }], pathGroupsExcludedImportTypes: [] }]
  assert.equal((await messages('import/order', options, 'import React from "react"; import fs from "node:fs"')).length, 0)
  assert.ok((await messages('import/order', options, 'import fs from "node:fs"; import React from "react"')).length > 0)
})

test('import internal module allow and forbid globs use the new matcher API', async () => {
  const code = 'import Link from "next/link"'
  assert.equal((await messages('import/no-internal-modules', [{ allow: ['next/**'] }], code)).length, 0)
  assert.equal((await messages('import/no-internal-modules', [{ allow: ['other/**'] }], code)).length, 1)
  assert.equal((await messages('import/no-internal-modules', [{ forbid: ['other/**'] }], code)).length, 0)
  assert.equal((await messages('import/no-internal-modules', [{ forbid: ['next/**'] }], code)).length, 1)
})

test('import restricted path globs retain Minimatch constructor behavior', async () => {
  const code = 'import { jadwalTimeline } from "./mockData"'
  const opts = from => [{ zones: [{ target: './lib/**', from }] }]
  assert.equal((await messages('import/no-restricted-paths', opts('./components/**'), code, 'lib/tahapan.ts')).length, 0)
  assert.equal((await messages('import/no-restricted-paths', opts('./lib/**'), code, 'lib/tahapan.ts')).length, 1)
})
