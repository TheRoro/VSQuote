const fs = require('fs')
const path = require('path')

const quotesDirectory = path.resolve(__dirname, '..', 'quotes')
const provenance = JSON.parse(
  fs.readFileSync(path.join(quotesDirectory, 'provenance.json'), 'utf8'),
)
const malformedText = /\b(?:won|can|couldn|wouldn|shouldn|isn|aren|wasn|weren|doesn|didn|hasn|haven|hadn) not\b/i
const unsafeCharacters = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\ufffd]/
const seen = new Map()
const errors = []
let total = 0

function normalize(text) {
  return text
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

for (const collection of provenance.collections) {
  const filePath = path.join(quotesDirectory, collection.file)
  let quotes

  try {
    quotes = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (error) {
    errors.push(`${collection.file}: invalid JSON (${error.message})`)
    continue
  }

  if (!Array.isArray(quotes)) {
    errors.push(`${collection.file}: root value must be an array`)
    continue
  }
  if (quotes.length !== collection.expectedCount) {
    errors.push(`${collection.file}: expected ${collection.expectedCount} entries, found ${quotes.length}`)
  }

  quotes.forEach((quote, index) => {
    const location = `${collection.file}:${index + 1}`
    if (!quote || typeof quote !== 'object' || Array.isArray(quote)) {
      errors.push(`${location}: entry must be an object`)
      return
    }
    if (Object.keys(quote).sort().join(',') !== 'author,text') {
      errors.push(`${location}: entry must contain only text and author`)
    }
    if (typeof quote.text !== 'string' || quote.text.trim() !== quote.text || !quote.text) {
      errors.push(`${location}: text must be a non-empty, trimmed string`)
    }
    if (typeof quote.author !== 'string' || quote.author.trim() !== quote.author || !quote.author) {
      errors.push(`${location}: author must be a non-empty, trimmed string`)
    }
    if (typeof quote.text !== 'string' || typeof quote.author !== 'string') return
    if (quote.text.length > 500) errors.push(`${location}: text exceeds 500 characters`)
    if (quote.author.length > 100) errors.push(`${location}: author exceeds 100 characters`)
    if (unsafeCharacters.test(quote.text) || unsafeCharacters.test(quote.author)) {
      errors.push(`${location}: contains control, replacement, or mojibake characters`)
    }
    if (malformedText.test(quote.text)) {
      errors.push(`${location}: contains a likely malformed contraction`)
    }

    const normalized = normalize(quote.text)
    const duplicate = seen.get(normalized)
    if (duplicate) errors.push(`${location}: duplicates ${duplicate}`)
    else seen.set(normalized, location)
  })

  total += quotes.length
}

const jsonFiles = fs.readdirSync(quotesDirectory)
  .filter(file => file.endsWith('.json') && file !== 'provenance.json')
  .sort()
const documentedFiles = provenance.collections.map(collection => collection.file).sort()
if (JSON.stringify(jsonFiles) !== JSON.stringify(documentedFiles)) {
  errors.push('provenance.json must document every quote collection exactly once')
}

if (errors.length > 0) {
  console.error(`Quote validation failed:\n- ${errors.join('\n- ')}`)
  process.exitCode = 1
} else {
  console.log(`Validated ${total} quotes across ${provenance.collections.length} collections.`)
}
