module.exports = {
	root: true,
	parserOptions: {
		project: './tsconfig.json',
		tsconfigRootDir: __dirname,
	},
	extends: ['lisk-base/ts'],
	rules: {
		'@typescript-eslint/member-ordering': 'off',
		'@typescript-eslint/no-unsafe-argument': ['warn'],
	},
};
