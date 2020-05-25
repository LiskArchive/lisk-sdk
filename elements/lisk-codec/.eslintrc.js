module.exports = {
	extends: '../../.eslintrc.js',
	parserOptions: {
		project: './tsconfig.json',
		tsconfigRootDir: __dirname,
	},
	rules: {
		'no-continue': 'off',
		'@typescript-eslint/prefer-for-of': 'off',
		'@typescript-eslint/no-use-before-define': 'off',
	},
};
