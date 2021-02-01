module.exports = {
	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: './tsconfig.json',
		tsconfigRootDir: __dirname,
	},
	plugins: ['@typescript-eslint'],
	extends: [
		'lisk-base/base',
		'plugin:@typescript-eslint/recommended',
		'plugin:@typescript-eslint/recommended-requiring-type-checking',
		'prettier/@typescript-eslint',
		'plugin:import/errors',
		'plugin:import/warnings',
		'plugin:import/typescript',
	],
	rules: {
		'max-len': 'off', // Managed by prettier
		'import/namespace': 'off',
		'no-underscore-dangle': 'off', // Used for private variables and methods
		'implicit-arrow-linebreak': 'off', // Prefered
		'no-mixed-spaces-and-tabs': 'off', // Managed by prettier
		'operator-linebreak': 'off',
		'import/prefer-default-export': 'off',
		'lines-between-class-members': 'off', // Off because typescript has members and methods
		'no-useless-constructor': 'off',
		'no-unused-expressions': 'off',
		'@typescript-eslint/consistent-type-assertions': ['error'],
		'@typescript-eslint/member-delimiter-style': ['error'],
		'@typescript-eslint/member-ordering': ['error'],
		'@typescript-eslint/no-extraneous-class': ['error'],
		'@typescript-eslint/no-unnecessary-boolean-literal-compare': ['error'],
		'@typescript-eslint/no-unnecessary-qualifier': ['error'],
		'@typescript-eslint/no-unnecessary-type-arguments': ['error'],
		'@typescript-eslint/prefer-for-of': ['error'],
		'@typescript-eslint/prefer-function-type': ['error'],
		'@typescript-eslint/prefer-includes': ['error'],
		'@typescript-eslint/prefer-nullish-coalescing': ['error'],
		'@typescript-eslint/prefer-optional-chain': ['error'],
		'@typescript-eslint/prefer-readonly': ['error'],
		'@typescript-eslint/prefer-reduce-type-parameter': ['error'],
		'@typescript-eslint/prefer-string-starts-ends-with': ['error'],
		'@typescript-eslint/prefer-ts-expect-error': ['error'],
		'@typescript-eslint/promise-function-async': ['error'],
		'@typescript-eslint/require-array-sort-compare': ['error'],
		'@typescript-eslint/switch-exhaustiveness-check': ['error'],
		'@typescript-eslint/type-annotation-spacing': ['error'],
		'@typescript-eslint/unified-signatures': ['error'],
		'@typescript-eslint/no-unused-expressions': ['error'],
		'@typescript-eslint/no-useless-constructor': ['error'],
		'@typescript-eslint/ban-types': 'warn',
		'@typescript-eslint/explicit-member-accessibility': 'off',
		'@typescript-eslint/no-unused-vars': 'off',
		'@typescript-eslint/restrict-template-expressions': [
			'error',
			{
				allowNumber: true,
				allowBoolean: true,
			},
		],
		'import/extensions': [
			'error',
			'ignorePackages',
			{
				js: 'never',
				ts: 'never',
			},
		],
	},
	globals: {
		BigInt: true,
	},
};
