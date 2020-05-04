module.exports = {
	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: './tsconfig.json',
		tsconfigRootDir: __dirname,
	},
	plugins: ['@typescript-eslint'],
	extends: [
		'lisk-base/base',
		'plugin:@typescript-eslint/eslint-recommended',
		'plugin:@typescript-eslint/all',
		'prettier/@typescript-eslint',
		'plugin:import/errors',
		'plugin:import/warnings',
		'plugin:import/typescript',
	],
	rules: {
		'max-len': 'off',
		'no-underscore-dangle': 'off',
		'implicit-arrow-linebreak': 'off',
		'no-mixed-spaces-and-tabs': 'off',
		'operator-linebreak': 'off',
		'import/prefer-default-export': 'off',
		'lines-between-class-members': 'off', // Off because typescript has members and methods
		'@typescript-eslint/typedef': 'off',
		'@typescript-eslint/explicit-function-return-type': ['warn'],
		'@typescript-eslint/prefer-readonly-parameter-types': 'off',
		'@typescript-eslint/no-type-alias': 'off',
		'@typescript-eslint/no-magic-numbers': 'off',
		'@typescript-eslint/no-throw-literal': 'off',
		'@typescript-eslint/no-dynamic-delete': 'off',
		'@typescript-eslint/no-implied-eval': 'off',
		'@typescript-eslint/strict-boolean-expressions': 'off',
		'@typescript-eslint/no-unused-vars': 'off',
		'@typescript-eslint/no-unused-vars-experimental': 'off',
		'@typescript-eslint/array-type': 'off',
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
