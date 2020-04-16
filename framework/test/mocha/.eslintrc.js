module.exports = {
	extends: ['../../.eslintrc.js', 'lisk-base/mocha'],
	env: {
		mocha: true,
	},
	parserOptions: {
		project: '../tsconfig.json',
		tsconfigRootDir: __dirname,
	},
	globals: {
		_: true,
		__testContext: true,
		expect: true,
		gc: true,
		sinonSandbox: true,
	},
	rules: {
		camelcase: 'off',
		'func-names': 'off',
		'no-plusplus': 'off',
		'no-new': 'off',
		'no-template-curly-in-string': 'off',
		'global-require': 'off',
		'prefer-destructuring': 'off',
		'arrow-body-style': 'off',
		'no-unused-expressions': 'off',
		'space-before-function-paren': 'off',
		'@typescript-eslint/no-unused-expressions': 'off',
		'chai-expect/missing-assertion': 'error',
		'chai-expect/no-inner-compare': 'error',
		'require-atomic-updates': ['warn'],
		'import/no-extraneous-dependencies': [
			'error',
			{
				devDependencies: ['./**'],
			},
		],
		'@typescript-eslint/no-empty-function': ['warn'],
		'@typescript-eslint/unbound-method': ['warn'],
		'@typescript-eslint/require-await': ['warn'],
	},
};
