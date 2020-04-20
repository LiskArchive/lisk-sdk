module.exports = {
	extends: ['.eslintrc.js', 'lisk-base/jest'],
	rules: {
		'arrow-body-style': 'off',
		'dot-notation': 'off',
		'@typescript-eslint/unbound-method': 'off',
		'@typescript-eslint/no-magic-numbers': 'off',
		'@typescript-eslint/no-require-imports': 'off',
		'@typescript-eslint/no-explicit-any': 'off',
		'@typescript-eslint/no-unsafe-assignment': 'off',
		'@typescript-eslint/no-unsafe-member-access': 'off',
		'@typescript-eslint/no-unsafe-call': 'off',
	},
};
