const vscode = require('vscode')
const inspirationalQuotes = require('../quotes/inspirational.json')
const funnyQuotes = require('../quotes/funny.json')
const stoicQuotes = require('../quotes/stoic.json')
const hypeQuotes = require('../quotes/hype.json')
const philosophicalQuotes = require('../quotes/philosophical.json')
const affirmationQuotes = require('../quotes/affirmations.json')
const genzQuotes = require('../quotes/genz.json')

let statusBarItem

const quotePools = {
  inspirational: inspirationalQuotes,
  funny: funnyQuotes,
  stoic: stoicQuotes,
  hype: hypeQuotes,
  philosophical: philosophicalQuotes,
  affirmations: affirmationQuotes,
  genz: genzQuotes,
}

function randomNumber(max) {
  return Math.floor(Math.random() * max);
}

function returnQuote() {
  const config = vscode.workspace.getConfiguration('vsquote')
  const mode = config.get('mode', 'genz')

  let pool
  if (mode === 'all') {
    pool = Object.values(quotePools).flat()
  } else {
    pool = quotePools[mode] || funnyQuotes
  }

  const index = randomNumber(pool.length)
  return pool[index]
}

function showQuoteInStatusBar(quote) {
  if (!statusBarItem) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100)
    statusBarItem.command = 'vsquote.getQuote'
    statusBarItem.show()
  }

  // Truncate for status bar display, show full on hover
  const maxLength = 50
  const shortText = quote.text.length > maxLength
    ? quote.text.substring(0, maxLength) + '...'
    : quote.text

  statusBarItem.text = `$(quote) ${shortText}`
  statusBarItem.tooltip = `"${quote.text}"\n— ${quote.author}`
}

function sendQuote(quote) {
  vscode.window.showInformationMessage(
    `"${quote.text}" - ${quote.author}`, "Another"
  ).then(selection => {
    if (selection === "Another") {
      const newQuote = returnQuote()
      sendQuote(newQuote)
      showQuoteInStatusBar(newQuote)
    }
  })
}

function isEnabled() {
  return vscode.workspace.getConfiguration('vsquote').get('enabled', true)
}

function hideStatusBar() {
  if (statusBarItem) {
    statusBarItem.hide()
  }
}

const startIntervalQuotes = () => {
  const config = vscode.workspace.getConfiguration('vsquote')
  const intervalMinutes = parseInt(config.get('interval', '60'))
  const ms = 1000 * 60 * intervalMinutes

  // Show a quote immediately on startup (if enabled)
  if (isEnabled()) {
    const quote = returnQuote()
    showQuoteInStatusBar(quote)
  }

  let timer = setInterval(() => {
    if (isEnabled()) {
      const quote = returnQuote()
      showQuoteInStatusBar(quote)
    }
  }, ms)

  // Re-create interval if settings change
  vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('vsquote.enabled')) {
      if (isEnabled()) {
        const quote = returnQuote()
        showQuoteInStatusBar(quote)
      } else {
        hideStatusBar()
      }
    }
    if (e.affectsConfiguration('vsquote.interval')) {
      clearInterval(timer)
      const newMinutes = parseInt(vscode.workspace.getConfiguration('vsquote').get('interval', '60'))
      const newMs = 1000 * 60 * newMinutes
      timer = setInterval(() => {
        if (isEnabled()) {
          const quote = returnQuote()
          showQuoteInStatusBar(quote)
        }
      }, newMs)
    }
    if (e.affectsConfiguration('vsquote.mode')) {
      if (isEnabled()) {
        const quote = returnQuote()
        showQuoteInStatusBar(quote)
      }
    }
  })
}

const getQuote = () => {
  if (!isEnabled()) {
    vscode.window.showInformationMessage('VSQuote is disabled. Enable it in settings.')
    return
  }
  const quote = returnQuote()
  sendQuote(quote)
  showQuoteInStatusBar(quote)
}

const getStatusBarItem = () => statusBarItem

exports.startIntervalQuotes = startIntervalQuotes
exports.getQuote = getQuote
exports.getStatusBarItem = getStatusBarItem