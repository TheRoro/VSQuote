# VSQuote - Inspirational Quotes for VSCode

![VSQuote Logo](https://raw.githubusercontent.com/TheRoro/VSQuote/main/images/VsQuoteIcon.png)

VSQuote is a Visual Studio Code extension that provides you with inspirational quotes directly within your code editor. It fetches quotes from the Quote API every hour and displays them in your VSCode text editor.

## Features

- **Inspirational Quotes:** Receive an inspirational quote from the Quote API every hour to keep you motivated and inspired while coding.

![VSQuote Quote Example](https://raw.githubusercontent.com/TheRoro/VSQuote/main/images/QuoteExample.png)

## Extension Settings

No configurations are needed for this extension. It works seamlessly in the background to deliver quotes to your VSCode editor.

## Release Notes

Inspirational quotes appear every hour and can be dismissed using the 'X' or the smile button.

### 2.0.0

- Update Logo and Improve README.md!

## Credits

Special thanks to WebDevSimplified for its amazing video tutorial on how to create a VSCode extension, which served as the inspiration for this project:

- [WebDevSimplified VSCode Extension Tutorial](https://www.youtube.com/watch?v=q5V4T3o3CXE)

This project relies on the Quote API provided by [type.fit](https://type.fit/api/quotes) to fetch inspirational quotes.

## Technical Details

VSQuote was developed using a range of technical skills and knowledge, including:

- **JavaScript:** The extension's core functionality is built using JavaScript.

- **Axios:** Axios is used to make HTTP requests to the Quote API to fetch quotes.

- **Async/Await:** Async and await are employed for handling asynchronous operations, such as API requests.

- **APIs:** The extension fetches quotes from the Quote API provided by [type.fit](https://type.fit/api/quotes) in JSON format.

- **VSCode API:** VSQuote leverages the VSCode API, including features like the `window` object for notifications and the `setInterval` function to fetch new quotes at specified intervals (every hour).

- **Random Quotes:** The extension randomly selects quotes from the API to provide users with diverse and inspiring messages.

![VSQuote Get Quote Example](https://raw.githubusercontent.com/TheRoro/VSQuote/main/images/GetQuoteExample.png)

## Installation

You can install VSQuote from the Visual Studio Code Extension Marketplace using the following link: [VSQuote Extension](https://marketplace.visualstudio.com/items?itemName=RodrigoRamirez.vsquote)

Stay inspired while coding with VSQuote!

Made with 🦔 by [@TheRoro](https://github.com/TheRoro)
