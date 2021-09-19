const vscode = require('vscode')
const axios = require('axios')

function randomNumber(max) {
  return Math.floor(Math.random() * max);
}

async function returnQuote() {
  const res = await axios.get('https://type.fit/api/quotes')
  const data = res.data
  const size = res.data.length
  let index = randomNumber(size)
  const quote = data[index]

  Object.keys(quote).map(function () {
    if (quote['author'] == null) {
      quote['author'] = 'Anonymous'
    }
  });
  return quote
}

function sendQuote(quote) {
  vscode.window.showInformationMessage(`
      "${quote.text}"
      - ${quote.author}
    `, ...[":)"])
}

const startIntervalQuotes = () => {
  const minute = 1000 * 60
  const minuteInterval = 60
  setInterval(async () => {
    const quote = await returnQuote()
    sendQuote(quote)
  }, minute * minuteInterval)
}

const getQuote = async () => {
  const quote = await returnQuote()
  sendQuote(quote)
}

exports.startIntervalQuotes = startIntervalQuotes
exports.getQuote = getQuote