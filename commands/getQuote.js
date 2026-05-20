const vscode = require('vscode')
const inspirationalQuotes = require('../quotes/inspirational.json')
const funnyQuotes = require('../quotes/funny.json')
const stoicQuotes = require('../quotes/stoic.json')
const hypeQuotes = require('../quotes/hype.json')
const philosophicalQuotes = require('../quotes/philosophical.json')
const affirmationQuotes = require('../quotes/affirmations.json')
const genzQuotes = require('../quotes/genz.json')

const DEFAULT_MODE = 'genz'
const DEFAULT_INTERVAL_MINUTES = 60
const ALLOWED_INTERVALS = new Set([30, 60, 120, 360, 720, 1440])

const quotePools = {
  inspirational: inspirationalQuotes,
  funny: funnyQuotes,
  stoic: stoicQuotes,
  hype: hypeQuotes,
  philosophical: philosophicalQuotes,
  affirmations: affirmationQuotes,
  genz: genzQuotes,
}

function parseIntervalMinutes(value) {
  const minutes = Number(value)
  return Number.isInteger(minutes) && ALLOWED_INTERVALS.has(minutes)
    ? minutes
    : DEFAULT_INTERVAL_MINUTES
}

function createQuoteManager(
  vscodeApi = vscode,
  timers = {
    setInterval: global.setInterval,
    clearInterval: global.clearInterval,
  },
) {
  let statusBarItem
  let interval
  let configurationSubscription

  function getConfiguration() {
    return vscodeApi.workspace.getConfiguration('vsquote')
  }

  function isEnabled() {
    return getConfiguration().get('enabled', true)
  }

  function getPool() {
    const mode = getConfiguration().get('mode', DEFAULT_MODE)
    return mode === 'all'
      ? Object.values(quotePools).flat()
      : quotePools[mode] || quotePools[DEFAULT_MODE]
  }

  function returnQuote(random = Math.random) {
    const pool = getPool()
    return pool[Math.floor(random() * pool.length)]
  }

  function showQuoteInStatusBar(quote) {
    if (!statusBarItem) {
      statusBarItem = vscodeApi.window.createStatusBarItem(
        vscodeApi.StatusBarAlignment.Right,
        100,
      )
      statusBarItem.command = 'vsquote.getQuote'
    }

    const maxLength = 50
    const shortText = quote.text.length > maxLength
      ? `${quote.text.substring(0, maxLength)}...`
      : quote.text

    statusBarItem.text = `$(quote) ${shortText}`
    statusBarItem.tooltip = `"${quote.text}"\n— ${quote.author}`
    statusBarItem.show()
  }

  function showNextQuote() {
    if (isEnabled()) {
      showQuoteInStatusBar(returnQuote())
    }
  }

  function hideStatusBar() {
    statusBarItem?.hide()
  }

  function restartInterval() {
    if (interval) timers.clearInterval(interval)
    const minutes = parseIntervalMinutes(getConfiguration().get('interval', String(DEFAULT_INTERVAL_MINUTES)))
    interval = timers.setInterval(showNextQuote, minutes * 60 * 1000)
  }

  function sendQuote(quote) {
    return vscodeApi.window.showInformationMessage(
      `"${quote.text}" - ${quote.author}`,
      'Another',
    ).then(selection => {
      if (selection === 'Another') {
        const nextQuote = returnQuote()
        showQuoteInStatusBar(nextQuote)
        return sendQuote(nextQuote)
      }
      return undefined
    })
  }

  function getQuote() {
    if (!isEnabled()) {
      return vscodeApi.window.showInformationMessage('VSQuote is disabled. Enable it in settings.')
    }

    const quote = returnQuote()
    showQuoteInStatusBar(quote)
    return sendQuote(quote)
  }

  function start() {
    if (configurationSubscription) return { dispose }

    showNextQuote()
    restartInterval()
    configurationSubscription = vscodeApi.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('vsquote.enabled')) {
        if (isEnabled()) showNextQuote()
        else hideStatusBar()
      }
      if (event.affectsConfiguration('vsquote.interval')) restartInterval()
      if (event.affectsConfiguration('vsquote.mode')) showNextQuote()
    })

    return { dispose }
  }

  function dispose() {
    if (interval) {
      timers.clearInterval(interval)
      interval = undefined
    }
    configurationSubscription?.dispose()
    configurationSubscription = undefined
    statusBarItem?.dispose()
    statusBarItem = undefined
  }

  return {
    dispose,
    getQuote,
    getStatusBarItem: () => statusBarItem,
    returnQuote,
    start,
  }
}

const quoteManager = createQuoteManager()

exports.startIntervalQuotes = () => quoteManager.start()
exports.getQuote = () => quoteManager.getQuote()
exports.getStatusBarItem = () => quoteManager.getStatusBarItem()
exports.dispose = () => quoteManager.dispose()
exports.createQuoteManager = createQuoteManager
exports.parseIntervalMinutes = parseIntervalMinutes
