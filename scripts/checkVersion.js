const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const lockfile = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'))
const changelog = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8')
const errors = []

if (manifest.version !== lockfile.version) {
	errors.push(`package-lock.json version is ${lockfile.version}, expected ${manifest.version}`)
}
if (manifest.version !== lockfile.packages?.['']?.version) {
	errors.push(`lockfile root package version does not match ${manifest.version}`)
}

const escapedVersion = manifest.version.replaceAll('.', '\\.')
const changelogHeading = new RegExp(`^## .*${escapedVersion}.*$`, 'm')
if (!changelogHeading.test(changelog)) {
	errors.push(`CHANGELOG.md has no release heading for ${manifest.version}`)
}

const tag = process.env.GITHUB_REF_TYPE === 'tag'
	? process.env.GITHUB_REF_NAME
	: process.argv.find(argument => argument.startsWith('v'))
if (tag && tag !== `v${manifest.version}`) {
	errors.push(`release tag ${tag} does not match package version v${manifest.version}`)
}

if (errors.length > 0) {
	console.error(`Version validation failed:\n- ${errors.join('\n- ')}`)
	process.exitCode = 1
} else {
	console.log(`Version metadata is synchronized at ${manifest.version}.`)
}
