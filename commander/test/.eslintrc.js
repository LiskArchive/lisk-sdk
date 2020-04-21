module.exports = {
	extends: ['../.eslintrc.js', 'lisk-base/mocha'],
	env: {
		mocha: true,
	},
	parserOptions: {
		project: './tsconfig.json',
		tsconfigRootDir: __dirname,
	},
	rules: {
		'arrow-body-style': 'off',
		'dot-notation': 'off',
		'mocha/no-synchronous-tests': 'off',
		'@typescript-eslint/no-unused-expressions': 'off',
		'@typescript-eslint/no-magic-numbers': 'off',
		'@typescript-eslint/unbound-method': 'off',
		'@typescript-eslint/no-require-imports': 'off',
		'@typescript-eslint/no-explicit-any': 'off',
		'@typescript-eslint/no-unsafe-assignment': 'off',
		'@typescript-eslint/no-unsafe-member-access': 'off',
		'@typescript-eslint/no-unsafe-call': 'off',
		'@typescript-eslint/no-unsafe-return': 'off',
		'import/no-extraneous-dependencies': [
			'error',
			{
				devDependencies: ['./**'],
			},
		],
	},
};
