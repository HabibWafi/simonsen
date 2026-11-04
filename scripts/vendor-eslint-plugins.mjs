// Rebuild the small, reviewed minimatch API migration for legacy ESLint plugins.
// Run through npm, or pass --npm-cli /absolute/path/to/npm-cli.js.
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const npmCli = process.env.npm_execpath || process.argv[process.argv.indexOf('--npm-cli') + 1]
if (!npmCli || !npmCli.endsWith('npm-cli.js')) throw new Error('Run with npm or supply --npm-cli npm-cli.js')
const minimatchVersion = '11.0.4'
const packages = [
  {
    name: 'eslint-plugin-react', version: '7.37.5',
    integrity: 'sha512-Qteup0SqU15kdocexFNAJMvCJEfa2xUKNV4CC1xsVMrIIqEy3SQ/rqyxCWNzfrd3/ldy6HMlD2e0JDVpDg2qIA==',
    patches: ['forbid-component-props', 'jsx-handler-names', 'jsx-pascal-case', 'no-danger', 'no-unstable-nested-components'].map(rule => ({
      file: `lib/rules/${rule}.js`, from: "const minimatch = require('minimatch');", to: "const { minimatch } = require('minimatch');", count: 1,
    })),
  },
  {
    name: 'eslint-plugin-import', version: '2.32.0', revision: 3,
    integrity: 'sha512-whOE1HFo/qJDyX4SnXzP4N6zOWn79WhnCUY/iDR0mPfQZO8wcYE4JClzI2oZrhBnnMUCBCHZhO6VQyoBU95mZA==',
    patches: [
      ...['extensions', 'no-import-module-exports', 'no-extraneous-dependencies', 'no-namespace', 'no-unassigned-import', 'order'].map(rule => ({
        file: `lib/rules/${rule}.js`, from: '_interopRequireDefault(_minimatch);', to: '_interopRequireDefault(_minimatch.minimatch);', count: 1,
      })),
      { file: 'lib/rules/no-internal-modules.js', from: "var _minimatch2 = _interopRequireDefault(_minimatch);", to: '', count: 1 },
      { file: 'lib/rules/no-internal-modules.js', from: "_minimatch2['default'].makeRe(p)", to: 'new _minimatch.Minimatch(p)', count: 2 },
      { file: 'lib/rules/no-internal-modules.js', from: 're.test(importPath)', to: 're.match(importPath)', count: 2 },
      ...['targetPath', 'absoluteFrom', 'except'].map(arg => ({
        file: 'lib/rules/no-restricted-paths.js', from: `new _minimatch.Minimatch(${arg})`, to: `new _minimatch.Minimatch(${arg}, { windowsPathsNoEscape: process.platform === 'win32' })`, count: 1,
      })),
    ],
  },
  {
    name: 'eslint-plugin-jsx-a11y', version: '6.10.2',
    integrity: 'sha512-scB3nz4WmG75pV8+3eRUQOHZlNSUhFNq37xnpgRkCCELU3XMvXAxLk1eqWWyE22Ki4Q01Fnsw9BA3cJHDPgn2Q==',
    patches: ['mayHaveAccessibleLabel', 'mayContainChildComponent'].map(util => ({
      file: `lib/util/${util}.js`, from: '_interopRequireDefault(require("minimatch"))', to: '_interopRequireDefault(require("minimatch").minimatch)', count: 1,
    })),
  },
]

const workspace = mkdtempSync(join(tmpdir(), 'simonsen-eslint-vendor-'))
mkdirSync(join(root, 'vendor'), { recursive: true })
for (const pkg of packages) {
  const url = `https://registry.npmjs.org/${pkg.name}/-/${pkg.name}-${pkg.version}.tgz`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Download failed: ${response.status} ${url}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  const integrity = `sha512-${createHash('sha512').update(bytes).digest('base64')}`
  if (integrity !== pkg.integrity) throw new Error(`Unexpected upstream content: ${pkg.name}`)
  const staging = join(workspace, pkg.name)
  mkdirSync(staging)
  const archive = join(staging, 'upstream.tgz')
  writeFileSync(archive, bytes)
  execFileSync('tar', ['-xzf', archive, '-C', staging])
  const directory = join(staging, 'package')
  for (const patch of pkg.patches) {
    const path = join(directory, patch.file)
    const before = readFileSync(path, 'utf8')
    if (before.split(patch.from).length - 1 !== patch.count) throw new Error(`Patch mismatch: ${pkg.name}/${patch.file}`)
    const after = before.replaceAll(patch.from, patch.to)
    // The original Babel source maps describe the old imports; don't ship stale maps.
    writeFileSync(path, after.replace(/^\/\/# sourceMappingURL=.*$/gm, ''))
  }
  const manifestPath = join(directory, 'package.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (manifest.name !== pkg.name || manifest.version !== pkg.version || manifest.dependencies.minimatch !== '^3.1.2') {
    throw new Error(`Unexpected upstream manifest: ${pkg.name}`)
  }
  manifest.version = `${pkg.version}+simonsen.${pkg.revision || 1}`
  manifest.dependencies.minimatch = minimatchVersion
  // Next 16.4.5 supplies its documented ESLint 10 context adapter for these rules.
  manifest.peerDependencies.eslint += ' || ^10.0.0'
  manifest.simonsenPatch = { upstream: `${pkg.name}@${pkg.version}`, integrity: pkg.integrity, minimatch: minimatchVersion }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  const output = JSON.parse(execFileSync(process.execPath, [npmCli, 'pack', directory, '--ignore-scripts', '--json', '--pack-destination', join(root, 'vendor')], { encoding: 'utf8' }))
  const packed = Array.isArray(output) ? output[0] : output[pkg.name]
  if (!packed?.filename) throw new Error(`Unexpected npm pack response: ${pkg.name}`)
  console.log(`${pkg.name}: ${packed.filename} (${packed.integrity})`)
}
