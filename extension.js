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

// this method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}
