module.exports = {
	root: true,
	extends: ['lisk-base/ts'],
	parserOptions: {
		project: './tsconfig.json',
		tsconfigRootDir: __dirname,
	},
	rules: {
		'@typescript-eslint/member-ordering': 'off',
	},
};
