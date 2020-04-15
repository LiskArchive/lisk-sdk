module.exports = {
	extends: ['.eslintrc.js', 'lisk-base/jest'],
	rules: {
		'arrow-body-style': 'off',
		'@typescript-eslint/no-magic-numbers': 'off',
		'@typescript-eslint/no-require-imports': 'off',
		'@typescript-eslint/no-unsafe-member-access': 'off',
		'@typescript-eslint/no-explicit-any': 'off',
	},
};
