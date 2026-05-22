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
const DEFAULT_STATUS_LENGTH = 32
const HISTORY_LIMIT = 20
const RECENT_LIMIT = 10
const ALLOWED_INTERVALS = new Set([30, 60, 120, 360, 720, 1440])
const FAVORITES_KEY = 'vsquote.favorites'
const ONBOARDING_KEY = 'vsquote.onboardingComplete'

const modes = [
  { value: 'genz', label: '$(sparkle) Gen Z', description: 'Chaotic developer energy' },
  { value: 'funny', label: '$(smiley) Funny', description: 'Comedy and coding humor' },
  { value: 'hype', label: '$(flame) Hype', description: 'Maximum shipping energy' },
  { value: 'inspirational', label: '$(lightbulb) Inspirational', description: 'Classic motivation' },
  { value: 'stoic', label: '$(law) Stoic', description: 'Calm, resilient perspective' },
  { value: 'philosophical', label: '$(question) Philosophical', description: 'Big questions and ideas' },
  { value: 'affirmations', label: '$(heart) Affirmations', description: 'Gentle positive reminders' },
  { value: 'all', label: '$(shuffle) All', description: 'A random mix of every vibe' },
]

const quotePools = {
  inspirational: inspirationalQuotes,
  funny: funnyQuotes,
  stoic: stoicQuotes,
  hype: hypeQuotes,
  philosophical: philosophicalQuotes,
  affirmations: affirmationQuotes,
  genz: genzQuotes,
}

/**
 * @typedef {{ text: string, author: string }} Quote
 *
 * @typedef {{
 *   get: (key: string, fallback: unknown) => unknown,
 *   update: (key: string, value: unknown, target?: unknown) => PromiseLike<void>
 * }} QuoteConfiguration
 *
 * @typedef {{
 *   label: string,
 *   description?: string,
 *   value?: string,
 *   quote?: Quote
 * }} QuoteQuickPickItem
 *
 * @typedef {{
 *   command?: string,
 *   name?: string,
 *   text?: string,
 *   tooltip?: string,
 *   accessibilityInformation?: { label: string, role?: string },
 *   show: () => void,
 *   hide: () => void,
 *   dispose: () => void
 * }} QuoteStatusBarItem
 *
 * @typedef {{
 *   StatusBarAlignment: { Right: number },
 *   ConfigurationTarget: { Global: unknown },
 *   workspace: {
 *     getConfiguration: (section: string) => QuoteConfiguration,
 *     onDidChangeConfiguration: (
 *       listener: (event: { affectsConfiguration: (section: string) => boolean }) => void
 *     ) => { dispose: () => void }
 *   },
 *   window: {
 *     createStatusBarItem: (alignment: number, priority: number) => QuoteStatusBarItem,
 *     showInformationMessage: (
 *       message: string,
 *       ...items: string[]
 *     ) => PromiseLike<string | undefined>,
 *     showQuickPick: (
 *       items: QuoteQuickPickItem[],
 *       options: {
 *         title: string,
 *         placeHolder: string,
 *         matchOnDescription?: boolean
 *       }
 *     ) => PromiseLike<QuoteQuickPickItem | undefined>
 *   },
 *   env: {
 *     clipboard: { writeText: (value: string) => PromiseLike<void> }
 *   }
 * }} QuoteVscodeApi
 *
 * @typedef {{
 *   setInterval: (callback: () => void, delay: number) => unknown,
 *   clearInterval: (interval: unknown) => void
 * }} TimerApi
 *
 * @typedef {{
 *   get: (key: string, fallback: unknown) => unknown,
 *   update: (key: string, value: unknown) => PromiseLike<void>
 * }} QuoteState
 */

function parseIntervalMinutes(value) {
  const minutes = Number(value)
  return Number.isInteger(minutes) && ALLOWED_INTERVALS.has(minutes)
    ? minutes
    : DEFAULT_INTERVAL_MINUTES
}

function parseStatusLength(value) {
  const length = Number(value)
  return Number.isInteger(length) && length >= 12 && length <= 80
    ? length
    : DEFAULT_STATUS_LENGTH
}

function quoteKey(quote) {
  return `${quote.text}\u0000${quote.author}`
}

function isQuote(value) {
  return Boolean(
    value
    && typeof value === 'object'
    && typeof value.text === 'string'
    && typeof value.author === 'string',
  )
}

function createMemoryState() {
  const values = new Map()
  return {
    get: (key, fallback) => values.has(key) ? values.get(key) : fallback,
    update: (key, value) => {
      values.set(key, value)
      return Promise.resolve()
    },
  }
}

/**
 * @param {QuoteVscodeApi} [vscodeApi]
 * @param {TimerApi} [timers]
 * @param {QuoteState} [state]
 */
function createQuoteManager(
  vscodeApi = /** @type {QuoteVscodeApi} */ (vscode),
  timers = {
    setInterval: (callback, delay) => global.setInterval(callback, delay),
    clearInterval: interval => global.clearInterval(
      /** @type {NodeJS.Timeout} */ (interval),
    ),
  },
  state = createMemoryState(),
) {
  let statusBarItem
  let interval
  let configurationSubscription
  let currentQuote
  const history = []

  function getConfiguration() {
    return vscodeApi.workspace.getConfiguration('vsquote')
  }

  function isEnabled() {
    return getConfiguration().get('enabled', true) === true
  }

  function getPool() {
    const mode = String(getConfiguration().get('mode', DEFAULT_MODE))
    return mode === 'all'
      ? Object.values(quotePools).flat()
      : quotePools[mode] || quotePools[DEFAULT_MODE]
  }

  function returnQuote(random = Math.random) {
    const pool = getPool()
    const recent = new Set(history.slice(0, RECENT_LIMIT).map(quoteKey))
    const candidates = pool.filter(quote => !recent.has(quoteKey(quote)))
    const available = candidates.length > 0 ? candidates : pool
    return available[Math.floor(random() * available.length)]
  }

  function getFavorites() {
    const stored = state.get(FAVORITES_KEY, [])
    return Array.isArray(stored) ? stored.filter(isQuote) : []
  }

  function rememberQuote(quote) {
    const key = quoteKey(quote)
    const existing = history.findIndex(item => quoteKey(item) === key)
    if (existing >= 0) history.splice(existing, 1)
    history.unshift(quote)
    history.splice(HISTORY_LIMIT)
  }

  /** @param {Quote} quote */
  function showQuoteInStatusBar(quote) {
    currentQuote = quote
    rememberQuote(quote)

    if (!statusBarItem) {
      statusBarItem = vscodeApi.window.createStatusBarItem(
        vscodeApi.StatusBarAlignment.Right,
        100,
      )
      statusBarItem.name = 'VSQuote'
      statusBarItem.command = 'vsquote.getQuote'
    }

    const maxLength = parseStatusLength(getConfiguration().get('statusBarMaxLength', DEFAULT_STATUS_LENGTH))
    const shortText = quote.text.length > maxLength
      ? `${quote.text.substring(0, maxLength).trimEnd()}…`
      : quote.text

    statusBarItem.text = `$(quote) ${shortText}`
    statusBarItem.tooltip = `"${quote.text}"\n— ${quote.author}\n\nClick for another quote.`
    statusBarItem.accessibilityInformation = {
      label: `VSQuote: ${quote.text}, by ${quote.author}. Activate for another quote.`,
      role: 'button',
    }
    statusBarItem.show()
  }

  function showNextQuote() {
    if (!isEnabled()) return
    showQuoteInStatusBar(returnQuote())
  }

  function hideStatusBar() {
    statusBarItem?.hide()
  }

  function restartInterval() {
    if (interval) timers.clearInterval(interval)
    const minutes = parseIntervalMinutes(
      getConfiguration().get('interval', String(DEFAULT_INTERVAL_MINUTES)),
    )
    interval = timers.setInterval(showNextQuote, minutes * 60 * 1000)
  }

  /** @param {Quote} quote */
  async function copyQuote(quote) {
    await vscodeApi.env.clipboard.writeText(`"${quote.text}" — ${quote.author}`)
    await vscodeApi.window.showInformationMessage('VSQuote copied to the clipboard.')
  }

  async function copyCurrentQuote() {
    if (!currentQuote) {
      await vscodeApi.window.showInformationMessage('No quote is available yet.')
      return
    }
    await copyQuote(currentQuote)
  }

  async function toggleFavorite() {
    if (!currentQuote) {
      await vscodeApi.window.showInformationMessage('No quote is available yet.')
      return
    }

    const favorites = getFavorites()
    const key = quoteKey(currentQuote)
    const index = favorites.findIndex(quote => quoteKey(quote) === key)
    const adding = index < 0
    if (adding) favorites.unshift(currentQuote)
    else favorites.splice(index, 1)

    await state.update(FAVORITES_KEY, favorites)
    await vscodeApi.window.showInformationMessage(
      adding ? 'Quote added to favorites.' : 'Quote removed from favorites.',
    )
  }

  async function pickAndCopy(quotes, title, emptyMessage) {
    if (quotes.length === 0) {
      await vscodeApi.window.showInformationMessage(emptyMessage)
      return
    }

    const selected = await vscodeApi.window.showQuickPick(
      quotes.map(quote => ({
        label: quote.text,
        description: quote.author,
        quote,
      })),
      {
        title,
        placeHolder: 'Select a quote to copy it',
        matchOnDescription: true,
      },
    )
    if (selected?.quote) await copyQuote(selected.quote)
  }

  function showFavorites() {
    return pickAndCopy(
      getFavorites(),
      'VSQuote Favorites',
      'You have no favorite quotes yet.',
    )
  }

  function showHistory() {
    return pickAndCopy(
      history,
      'VSQuote History',
      'No quotes have appeared in this session yet.',
    )
  }

  async function chooseMode(firstRun = false) {
    const choices = firstRun
      ? [...modes, { value: '', label: 'Not now', description: 'Keep the Gen Z default' }]
      : modes
    const selected = await vscodeApi.window.showQuickPick(choices, {
      title: firstRun ? 'Welcome to VSQuote — choose your vibe' : 'Choose your VSQuote vibe',
      placeHolder: 'You can change this anytime',
    })

    if (selected?.value) {
      await getConfiguration().update(
        'mode',
        selected.value,
        vscodeApi.ConfigurationTarget.Global,
      )
    }
    if (firstRun) await state.update(ONBOARDING_KEY, true)
  }

  async function offerFirstRunMode() {
    if (state.get(ONBOARDING_KEY, false) === true) return
    await chooseMode(true)
  }

  async function sendQuote(quote) {
    const favorites = getFavorites()
    const isFavorite = favorites.some(item => quoteKey(item) === quoteKey(quote))
    const favoriteAction = isFavorite ? 'Unfavorite' : 'Favorite'
    const selection = await vscodeApi.window.showInformationMessage(
      `"${quote.text}" — ${quote.author}`,
      'Another',
      'Copy',
      favoriteAction,
    )

    if (selection === 'Another') {
      const nextQuote = returnQuote()
      showQuoteInStatusBar(nextQuote)
      await sendQuote(nextQuote)
    } else if (selection === 'Copy') {
      await copyQuote(quote)
    } else if (selection === favoriteAction) {
      currentQuote = quote
      await toggleFavorite()
    }
  }

  async function getQuote() {
    if (!isEnabled()) {
      await vscodeApi.window.showInformationMessage('VSQuote is disabled. Enable it in settings.')
      return
    }

    const quote = returnQuote()
    showQuoteInStatusBar(quote)
    await sendQuote(quote)
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
      if (event.affectsConfiguration('vsquote.statusBarMaxLength') && currentQuote) {
        showQuoteInStatusBar(currentQuote)
      }
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
    chooseMode,
    copyCurrentQuote,
    dispose,
    getCurrentQuote: () => currentQuote,
    getHistory: () => [...history],
    getQuote,
    getStatusBarItem: () => statusBarItem,
    offerFirstRunMode,
    returnQuote,
    showFavorites,
    showHistory,
    start,
    toggleFavorite,
  }
}

exports.createQuoteManager = createQuoteManager
exports.parseIntervalMinutes = parseIntervalMinutes
exports.parseStatusLength = parseStatusLength
