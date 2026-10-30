// Builds dist/resources.json for adblock-rust 0.13.x: uBlock Origin's scriptlets and redirect resources
// (from a uBlock Origin release) plus Brave's own resources. Same steps as Brave's
// brave-core-crx-packager (lib/adBlockRustUtils.js).
//
//   UBO_TAG=1.75.0 node build.mjs     # a specific uBlock Origin release
//   node build.mjs                    # the latest release
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { uBlockResources } from 'adblock-rs'

const BRAVE_RESOURCES = 'https://raw.githubusercontent.com/brave/adblock-resources/master/dist/resources.json'
// Bit 0 of a resource's permission mask: uBlock Origin's "trusted" scriptlets. The app grants it only to
// uBlock Origin's own filter lists.
const TRUSTED = 1

async function latestUboTag () {
  const res = await fetch('https://api.github.com/repos/gorhill/uBlock/releases/latest', {
    headers: { Accept: 'application/vnd.github+json' }
  })
  if (!res.ok) throw new Error(`GitHub API ${res.status}`)
  return (await res.json()).tag_name
}

const tag = process.env.UBO_TAG || await latestUboTag()
const work = mkdtempSync(path.join(tmpdir(), 'ubo-'))
const archive = path.join(work, 'ubo.tar.gz')
const res = await fetch(`https://codeload.github.com/gorhill/uBlock/tar.gz/refs/tags/${tag}`)
if (!res.ok) throw new Error(`uBlock Origin ${tag}: HTTP ${res.status}`)
writeFileSync(archive, Buffer.from(await res.arrayBuffer()))
execFileSync('tar', ['-xzf', archive, '-C', work])
const ubo = path.join(work, `uBlock-${tag}`)

const { builtinScriptlets } = await import(pathToFileURL(path.join(ubo, 'src/js/resources/scriptlets.js')).href)
const names = new Set(builtinScriptlets.map(s => s.name))
for (const s of builtinScriptlets) {
  for (const dep of s.dependencies ?? []) {
    if (!names.has(dep)) throw new Error(`scriptlet ${s.name} needs missing dependency ${dep}`)
  }
}
const scriptlets = builtinScriptlets.map(s => {
  const resource = {
    name: s.name,
    aliases: s.aliases ?? [],
    kind: { mime: 'application/javascript' },
    content: Buffer.from(s.fn.toString()).toString('base64'),
    dependencies: s.dependencies ?? []
  }
  if (s.requiresTrust) resource.permission = TRUSTED
  return resource
})

const redirects = uBlockResources(
  path.join(ubo, 'src/web_accessible_resources'),
  path.join(ubo, 'src/js/redirect-resources.js')
).filter(r => r.name !== 'google-ima-dai.js') // excluded by Brave too

const brave = await (await fetch(BRAVE_RESOURCES)).json()

const resources = [...redirects, ...brave, ...scriptlets]
mkdirSync('dist', { recursive: true })
const out = JSON.stringify(resources)
const previous = existsSync('dist/resources.json') ? readFileSync('dist/resources.json', 'utf8') : ''
writeFileSync('dist/resources.json', out)
writeFileSync('dist/meta.json', JSON.stringify({ ublockOrigin: tag, resources: resources.length, scriptlets: scriptlets.length }, null, 2) + '\n')
console.log(`${resources.length} resources (${scriptlets.length} scriptlets) from uBlock Origin ${tag}${out === previous ? ', unchanged' : ''}`)
