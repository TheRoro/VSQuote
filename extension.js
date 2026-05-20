const vscode = require('vscode')
const Quotes = require('./commands/getQuote')

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	console.log('VSQuote is active...')
	Quotes.startIntervalQuotes()

	let disposable = vscode.commands.registerCommand(
		'vsquote.getQuote', function () {
			Quotes.getQuote()
		});

	context.subscriptions.push(disposable);
}

function deactivate() {
	const statusBarItem = Quotes.getStatusBarItem()
	if (statusBarItem) {
		statusBarItem.dispose()
	}
}

module.exports = {
	activate,
	deactivate
}
