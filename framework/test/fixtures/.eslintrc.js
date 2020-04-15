module.exports = {
	extends: ['../../.eslintrc.js'],
	parserOptions: {
		project: '../tsconfig.json',
		tsconfigRootDir: __dirname,
	},
	rules: {
		'import/no-extraneous-dependencies': [
			'error',
			{
				devDependencies: ['./**'],
			},
		],
	},
};
