const assert = require('assert')
const vscode = require('vscode')
const Quotes = require('../../commands/getQuote')

function createFakeVscode(settings = {}) {
	const listeners = []
	const statusItems = []
	const messages = []
	const quickPicks = []
	const configurationUpdates = []
	const clipboard = []
	const informationSelections = []
	const quickPickSelections = []

	return {
		StatusBarAlignment: { Right: 2 },
		ConfigurationTarget: { Global: 1 },
		workspace: {
			getConfiguration: () => ({
				get: (key, fallback) => settings[key] ?? fallback,
				update: (key, value, target) => {
					settings[key] = value
					configurationUpdates.push({ key, value, target })
					return Promise.resolve()
				},
			}),
			onDidChangeConfiguration: listener => {
				listeners.push(listener)
				return {
					dispose: () => {
						const index = listeners.indexOf(listener)
						if (index >= 0) listeners.splice(index, 1)
					},
				}
			},
		},
		window: {
			createStatusBarItem: () => {
				const item = {
					disposed: false,
					hidden: false,
					show() { this.hidden = false },
					hide() { this.hidden = true },
					dispose() { this.disposed = true },
				}
				statusItems.push(item)
				return item
			},
			showInformationMessage: message => {
				messages.push(message)
				return Promise.resolve(informationSelections.shift())
			},
			showQuickPick: (items, options) => {
				quickPicks.push({ items, options })
				const next = quickPickSelections.shift()
				return Promise.resolve(
					typeof next === 'number' ? items[next] : undefined,
				)
			},
		},
		env: {
			clipboard: {
				writeText: value => {
					clipboard.push(value)
					return Promise.resolve()
				},
			},
		},
		clipboard,
		configurationUpdates,
		informationSelections,
		listeners,
		messages,
		quickPicks,
		quickPickSelections,
		settings,
		statusItems,
	}
}

function createState(initial = {}) {
	const values = new Map(Object.entries(initial))
	return {
		get: (key, fallback) => values.has(key) ? values.get(key) : fallback,
		update: (key, value) => {
			values.set(key, value)
			return Promise.resolve()
		},
		values,
	}
}

function createTimers() {
	const scheduled = []
	const cleared = []
	return {
		api: {
			setInterval: (callback, delay) => {
				const timer = { callback, delay }
				scheduled.push(timer)
				return timer
			},
			clearInterval: timer => cleared.push(timer),
		},
		cleared,
		scheduled,
	}
}

/** @type {Array<[string, () => void | Promise<void>]>} */
const tests = [
	['activates and registers every command', async () => {
		const extension = vscode.extensions.getExtension('RodrigoRamirez.vsquote')
		assert.ok(extension, 'The VSQuote extension should be discoverable')
		await extension.activate()

		assert.strictEqual(extension.isActive, true)
		const commands = await vscode.commands.getCommands(true)
		for (const command of [
			'vsquote.getQuote',
			'vsquote.copyQuote',
			'vsquote.toggleFavorite',
			'vsquote.showFavorites',
			'vsquote.showHistory',
			'vsquote.chooseMode',
		]) {
			assert.ok(commands.includes(command), `${command} should be registered`)
		}
	}],

	['suppresses recent repeats within the selected mode', () => {
		const fake = createFakeVscode({ mode: 'stoic' })
		const manager = Quotes.createQuoteManager(fake)

		manager.start()
		const first = manager.getCurrentQuote()
		const second = manager.returnQuote(() => 0)

		assert.ok(first)
		assert.notDeepStrictEqual(second, first)
		assert.strictEqual(manager.getHistory().length, 1)
		manager.dispose()
	}],

	['uses a compact configurable and accessible status item', () => {
		const fake = createFakeVscode({
			mode: 'stoic',
			statusBarMaxLength: 12,
		})
		const manager = Quotes.createQuoteManager(fake)

		manager.start()
		const item = fake.statusItems[0]
		assert.strictEqual(item.name, 'VSQuote')
		assert.match(item.text, /^\$\(quote\) .{1,12}…$/u)
		assert.strictEqual(item.accessibilityInformation.role, 'button')
		assert.match(item.accessibilityInformation.label, /^VSQuote: .+, by .+/)
		assert.strictEqual(Quotes.parseStatusLength('invalid'), 32)
		assert.strictEqual(Quotes.parseStatusLength(80), 80)
		manager.dispose()
	}],

	['updates status visibility, mode, width, and interval with settings', () => {
		const fake = createFakeVscode({ enabled: true, mode: 'genz', interval: '30' })
		const timers = createTimers()
		const manager = Quotes.createQuoteManager(fake, timers.api)

		manager.start()
		assert.strictEqual(timers.scheduled[0].delay, 30 * 60 * 1000)

		fake.settings.enabled = false
		fake.listeners[0]({ affectsConfiguration: key => key === 'vsquote.enabled' })
		assert.strictEqual(fake.statusItems[0].hidden, true)

		fake.settings.enabled = true
		fake.settings.mode = 'stoic'
		fake.listeners[0]({ affectsConfiguration: key => key === 'vsquote.mode' })
		assert.strictEqual(fake.statusItems[0].hidden, false)

		fake.settings.statusBarMaxLength = 12
		fake.listeners[0]({ affectsConfiguration: key => key === 'vsquote.statusBarMaxLength' })
		assert.match(fake.statusItems[0].text, /…$/u)

		fake.settings.interval = '120'
		fake.listeners[0]({ affectsConfiguration: key => key === 'vsquote.interval' })
		assert.strictEqual(timers.scheduled[1].delay, 120 * 60 * 1000)
		assert.strictEqual(timers.cleared.length, 1)
		manager.dispose()
	}],

	['copies the current quote and session history selections', async () => {
		const fake = createFakeVscode({ enabled: true, mode: 'genz' })
		const manager = Quotes.createQuoteManager(fake)

		manager.start()
		await manager.copyCurrentQuote()
		assert.match(fake.clipboard[0], /^".+" — .+$/)

		fake.quickPickSelections.push(0)
		await manager.showHistory()
		assert.strictEqual(fake.quickPicks[0].options.title, 'VSQuote History')
		assert.strictEqual(fake.clipboard.length, 2)
		manager.dispose()
	}],

	['persists favorites and copies a selected favorite', async () => {
		const fake = createFakeVscode({ enabled: true })
		const state = createState()
		const manager = Quotes.createQuoteManager(fake, undefined, state)

		manager.start()
		await manager.toggleFavorite()
		const favorites = state.values.get('vsquote.favorites')
		assert.strictEqual(favorites.length, 1)

		fake.quickPickSelections.push(0)
		await manager.showFavorites()
		assert.strictEqual(fake.quickPicks[0].options.title, 'VSQuote Favorites')
		assert.strictEqual(fake.clipboard.length, 1)

		await manager.toggleFavorite()
		assert.strictEqual(state.values.get('vsquote.favorites').length, 0)
		manager.dispose()
	}],

	['offers an optional first-run vibe selector only once', async () => {
		const fake = createFakeVscode()
		const state = createState()
		const manager = Quotes.createQuoteManager(fake, undefined, state)

		fake.quickPickSelections.push(4)
		await manager.offerFirstRunMode()
		assert.deepStrictEqual(fake.configurationUpdates[0], {
			key: 'mode',
			value: 'stoic',
			target: 1,
		})
		assert.strictEqual(state.values.get('vsquote.onboardingComplete'), true)

		await manager.offerFirstRunMode()
		assert.strictEqual(fake.quickPicks.length, 1)
		manager.dispose()
	}],

	['falls back safely and disposes every owned resource', async () => {
		const fake = createFakeVscode({
			enabled: false,
			interval: 'not-a-number',
			mode: 'not-a-mode',
		})
		const timers = createTimers()
		const manager = Quotes.createQuoteManager(fake, timers.api)

		manager.start()
		await manager.getQuote()
		assert.deepStrictEqual(fake.messages, ['VSQuote is disabled. Enable it in settings.'])
		assert.strictEqual(timers.scheduled[0].delay, 60 * 60 * 1000)
		assert.strictEqual(manager.returnQuote(() => 0).author, 'VSQuote')

		fake.settings.enabled = true
		fake.listeners[0]({ affectsConfiguration: key => key === 'vsquote.enabled' })
		const statusItem = fake.statusItems[0]
		manager.dispose()

		assert.strictEqual(fake.listeners.length, 0)
		assert.strictEqual(statusItem.disposed, true)
		assert.strictEqual(manager.getStatusBarItem(), undefined)
	}],
]

async function run() {
	for (const [name, test] of tests) {
		await test()
		console.log(`  ✓ ${name}`)
	}
	console.log(`\n  ${tests.length} passing`)
}

module.exports = { run }
