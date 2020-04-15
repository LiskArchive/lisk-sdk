module.exports = {
	extends: ['../../.eslintrc.js', 'lisk-base/jest'],
	parserOptions: {
		project: '../tsconfig.json',
		tsconfigRootDir: __dirname,
	},
	rules: {
		'callback-return': 'error',
		'no-unused-expressions': 'off',
		'arrow-body-style': 'off',
		'@typescript-eslint/no-magic-numbers': 'off',
		'@typescript-eslint/no-empty-function': ['warn'],
		'@typescript-eslint/unbound-method': ['warn'],
		'@typescript-eslint/require-await': ['warn'],
	},
};
