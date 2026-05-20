const vscode = require('vscode')
const Quotes = require('./commands/getQuote')

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	console.log('VSQuote is active...')
	const quoteManager = Quotes.startIntervalQuotes()

	const command = vscode.commands.registerCommand(
		'vsquote.getQuote', function () {
			Quotes.getQuote()
		})

	context.subscriptions.push(command, quoteManager)
}

function deactivate() {
	Quotes.dispose()
}

module.exports = {
	activate,
	deactivate
}
