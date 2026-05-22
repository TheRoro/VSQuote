const vscode = require('vscode')
const Quotes = require('./commands/getQuote')

let quoteManager

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	console.log('VSQuote is active...')
	quoteManager = Quotes.createQuoteManager(undefined, undefined, {
		get: (key, fallback) => context.globalState.get(key, fallback),
		update: (key, value) => context.globalState.update(key, value),
	})

	/** @type {Array<[string, () => unknown]>} */
	const commandDefinitions = [
		['vsquote.getQuote', () => quoteManager.getQuote()],
		['vsquote.copyQuote', () => quoteManager.copyCurrentQuote()],
		['vsquote.toggleFavorite', () => quoteManager.toggleFavorite()],
		['vsquote.showFavorites', () => quoteManager.showFavorites()],
		['vsquote.showHistory', () => quoteManager.showHistory()],
		['vsquote.chooseMode', () => quoteManager.chooseMode()],
	]
	const commands = commandDefinitions.map(
		([command, handler]) => vscode.commands.registerCommand(command, handler),
	)

	context.subscriptions.push(...commands, quoteManager.start())
	void quoteManager.offerFirstRunMode()
}

function deactivate() {
	quoteManager?.dispose()
	quoteManager = undefined
}

module.exports = {
	activate,
	deactivate
}
