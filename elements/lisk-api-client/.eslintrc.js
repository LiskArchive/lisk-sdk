module.exports = {
	extends: '../../.eslintrc.js',
	parserOptions: {
		project: './tsconfig.json',
		tsconfigRootDir: __dirname,
	},
	rules: {
		'import/no-cycle': 'off', // Off because this library depends on circular import
	},
};
