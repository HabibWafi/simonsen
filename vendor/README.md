# Vendored dependencies

`xlsx-0.20.3.tgz` is the existing SheetJS distribution used by the application.

## ESLint plugins using minimatch 11

The application uses ESLint **10.14.0** and minimatch **11.0.4**. These are different packages with independent version numbers. A root minimatch override pins every dependency branch to 11.0.4.

The latest published versions of the three plugins below still require the callable minimatch 3 API. The local distributions preserve their rules and licenses and migrate the affected imports to the real minimatch 11 implementation. They contain no copy of minimatch 3 and do not run install scripts.

| Archive | Upstream | Local changes |
| --- | --- | --- |
| `eslint-plugin-react-7.37.5+simonsen.1.tgz` | [eslint-plugin-react 7.37.5](https://github.com/jsx-eslint/eslint-plugin-react/tree/v7.37.5) | Five rules import the named `minimatch` function. |
| `eslint-plugin-import-2.32.0+simonsen.3.tgz` | [eslint-plugin-import 2.32.0](https://github.com/import-js/eslint-plugin-import/tree/v2.32.0) | Six callable imports use the named function. `no-internal-modules` uses `Minimatch.match()` instead of the removed regex API. Restricted path globs retain Windows path separator handling. |
| `eslint-plugin-jsx-a11y-6.10.2+simonsen.1.tgz` | [eslint-plugin-jsx-a11y 6.10.2](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/tree/v6.10.2) | Two accessibility helpers import the named function. |

All three declare minimatch 11.0.4 and include ESLint 10 in their peer range. The `+simonsen.N` build metadata identifies the local patch while satisfying Next's existing plugin version ranges. These files are direct development dependencies so npm resolves local archives relative to the repository root. No absolute machine paths or postinstall patches are needed.

`eslint.config.mjs` uses the official `@eslint/compat` utility for the deprecated ESLint context/token APIs still used by plugins. No lint rules are disabled by this migration. The checked-in tests cover glob matching, permitted and rejected code, accessibility labels, import ordering and restrictions, file ignores, and the complete lockfile's minimatch versions.

### Rebuild and review

Run `npm run vendor:eslint` using Node 24 and a `tar` command. The script:

1. Downloads the exact upstream tarballs from the npm registry.
2. Verifies their pinned SHA-512 integrity before extraction.
3. Applies explicit replacements, failing if the expected source differs.
4. Removes stale inline source maps in patched files and adds `simonsenPatch` provenance to each manifest.
5. Packs the local archives with lifecycle scripts disabled; archive integrity is also recorded in `package-lock.json`.

The script supports npm's array and package-keyed JSON pack output. With an unpacked npm CLI, use `node scripts/vendor-eslint-plugins.mjs --npm-cli /path/to/npm-cli.js`.

After a patch change, increment its local revision and update the dependency path, run `npm install`, then verify with `npm ci --ignore-scripts`, `npm run security:check`, `npm run test:schedule`, and `npm run build`. Keep the archives in Git and deployment uploads.

Maintainer responsibility: recheck upstream plugin support at each lint toolchain update. Remove each local distribution when the official package supports minimatch 11 and passes the same regression tests. Do not restore a minimatch 3 override as a rollback shortcut.
