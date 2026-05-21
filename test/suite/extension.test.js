const assert = require('assert')
const vscode = require('vscode')
const Quotes = require('../../commands/getQuote')

function createFakeVscode(settings = {}) {
	const listeners = []
	const statusItems = []
	const messages = []

	return {
		StatusBarAlignment: { Right: 2 },
		workspace: {
			getConfiguration: () => ({
				get: (key, fallback) => settings[key] ?? fallback,
			}),
			onDidChangeConfiguration: listener => {
				listeners.push(listener)
				return { dispose: () => listeners.splice(listeners.indexOf(listener), 1) }
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
				return Promise.resolve(undefined)
			},
		},
		listeners,
		messages,
		settings,
		statusItems,
	}
}

/** @type {Array<[string, () => void | Promise<void>]>} */
const tests = [
	['activates and registers its command', async () => {
		const extension = vscode.extensions.getExtension('RodrigoRamirez.vsquote')
		assert.ok(extension, 'The VSQuote extension should be discoverable')
		await extension.activate()

		assert.strictEqual(extension.isActive, true)
		const commands = await vscode.commands.getCommands(true)
		assert.ok(commands.includes('vsquote.getQuote'))
		assert.ok(Quotes.getStatusBarItem(), 'Activation should create the status bar item')
	}],

	['selects quotes from the configured mode', () => {
		const fake = createFakeVscode({ mode: 'stoic' })
		const manager = Quotes.createQuoteManager(fake)
		const quote = manager.returnQuote(() => 0)

		assert.strictEqual(quote.author, 'Marcus Aurelius')
		assert.match(quote.text, /power over your mind/i)
		manager.dispose()
	}],

	['falls back safely for malformed mode and interval settings', () => {
		const fake = createFakeVscode({ mode: 'not-a-mode' })
		const manager = Quotes.createQuoteManager(fake)
		const quote = manager.returnQuote(() => 0)

		assert.strictEqual(quote.author, 'VSQuote')
		assert.strictEqual(Quotes.parseIntervalMinutes('not-a-number'), 60)
		assert.strictEqual(Quotes.parseIntervalMinutes('5'), 60)
		assert.strictEqual(Quotes.parseIntervalMinutes('120'), 120)
		manager.dispose()
	}],

	['updates status visibility, mode, and interval with settings', () => {
		const fake = createFakeVscode({ enabled: true, mode: 'genz', interval: '30' })
		const scheduled = []
		const cleared = []
		const manager = Quotes.createQuoteManager(fake, {
			setInterval: (callback, delay) => {
				const timer = { callback, delay }
				scheduled.push(timer)
				return timer
			},
			clearInterval: timer => cleared.push(timer),
		})

		manager.start()
		assert.strictEqual(scheduled[0].delay, 30 * 60 * 1000)
		assert.match(fake.statusItems[0].text, /^\$\(quote\) /)

		fake.settings.enabled = false
		fake.listeners[0]({ affectsConfiguration: key => key === 'vsquote.enabled' })
		assert.strictEqual(fake.statusItems[0].hidden, true)

		fake.settings.enabled = true
		fake.settings.mode = 'stoic'
		fake.listeners[0]({ affectsConfiguration: key => key === 'vsquote.mode' })
		assert.strictEqual(fake.statusItems[0].hidden, false)

		fake.settings.interval = '120'
		fake.listeners[0]({ affectsConfiguration: key => key === 'vsquote.interval' })
		assert.strictEqual(scheduled[1].delay, 120 * 60 * 1000)
		assert.strictEqual(cleared.length, 1)
		manager.dispose()
	}],

	['handles commands and disposes every owned resource', async () => {
		const fake = createFakeVscode({ enabled: false })
		const timers = []
		const manager = Quotes.createQuoteManager(fake, {
			setInterval: callback => {
				timers.push(callback)
				return callback
			},
			clearInterval: timer => timers.splice(timers.indexOf(timer), 1),
		})

		manager.start()
		await manager.getQuote()
		assert.deepStrictEqual(fake.messages, ['VSQuote is disabled. Enable it in settings.'])

		fake.settings.enabled = true
		await manager.getQuote()
		assert.strictEqual(fake.messages.length, 2)
		assert.match(fake.messages[1], /^".+" - .+$/)

		fake.listeners[0]({ affectsConfiguration: key => key === 'vsquote.enabled' })
		const statusItem = fake.statusItems[0]
		manager.dispose()

		assert.strictEqual(timers.length, 0)
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
