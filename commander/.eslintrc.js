module.exports = {
	extends: '../.eslintrc.js',
	parserOptions: {
		project: './tsconfig.json',
		tsconfigRootDir: __dirname,
	},
	rules: {
		'@typescript-eslint/explicit-member-accessibility': 'off',
	},
};
