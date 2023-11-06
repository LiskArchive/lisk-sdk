module.exports = {
	extends: ['lisk-base/ts-jest'],
	parserOptions: {
		project: './tsconfig.json',
		tsconfigRootDir: __dirname,
	},
	rules: {
		'@typescript-eslint/member-ordering': 'off',
		'@typescript-eslint/no-unsafe-argument': 'off',
	},
};
