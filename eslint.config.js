const eslint = require('@eslint/js')
const globals = require('globals')

module.exports = [
	{
		ignores: [
			'artifacts/**',
			'node_modules/**',
			'.vscode-test/**',
		],
	},
	eslint.configs.recommended,
	{
		files: ['**/*.js'],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'commonjs',
			globals: globals.node,
		},
		rules: {
			'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
		},
	},
]
