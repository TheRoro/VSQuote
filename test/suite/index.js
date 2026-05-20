const extensionTests = require('./extension.test')

async function run() {
	await extensionTests.run()
}

module.exports = { run }
