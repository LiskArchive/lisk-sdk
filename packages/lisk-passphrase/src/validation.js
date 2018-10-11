'use strict';
var __importStar =
	(this && this.__importStar) ||
	function(mod) {
		if (mod && mod.__esModule) return mod;
		var result = {};
		if (mod != null)
			for (var k in mod)
				if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
		result['default'] = mod;
		return result;
	};
exports.__esModule = true;
var Mnemonic = __importStar(require('bip39'));
var passphraseRegularExpression = {
	uppercaseRegExp: /[A-Z]/g,
	whitespaceRegExp: /\s/g,
};
exports.countPassphraseWhitespaces = function(passphrase) {
	var whitespaceMatches = passphrase.match(
		passphraseRegularExpression.whitespaceRegExp,
	);
	return whitespaceMatches !== null ? whitespaceMatches.length : 0;
};
exports.countPassphraseWords = function(passphrase) {
	return passphrase.split(' ').filter(Boolean).length;
};
exports.countUppercaseCharacters = function(passphrase) {
	var uppercaseCharacterMatches = passphrase.match(
		passphraseRegularExpression.uppercaseRegExp,
	);
	return uppercaseCharacterMatches !== null
		? uppercaseCharacterMatches.length
		: 0;
};
exports.locateUppercaseCharacters = function(passphrase) {
	return passphrase.split('').reduce(function(passphraseArray, element, index) {
		if (element.match(passphraseRegularExpression.uppercaseRegExp) !== null) {
			return passphraseArray.concat([index]);
		} else {
			return passphraseArray;
		}
	}, []);
};
exports.locateConsecutiveWhitespaces = function(passphrase) {
	return passphrase.split('').reduce(function(passphraseArray, element, index) {
		if (index === 0) {
			if (
				element.match(passphraseRegularExpression.whitespaceRegExp) !== null
			) {
				return passphraseArray.concat([index]);
			} else {
				return passphraseArray;
			}
		} else if (index !== passphrase.length - 1) {
			if (
				element.match(passphraseRegularExpression.whitespaceRegExp) !== null &&
				passphrase
					.split('')
					[index - 1].match(passphraseRegularExpression.whitespaceRegExp) !==
					null
			) {
				return passphraseArray.concat([index]);
			} else {
				return passphraseArray;
			}
		} else {
			if (
				element.match(passphraseRegularExpression.whitespaceRegExp) !== null
			) {
				return passphraseArray.concat([index]);
			} else {
				return passphraseArray;
			}
		}
	}, []);
};
exports.getPassphraseValidationErrors = function(passphrase, wordlists) {
	var expectedWords = 12;
	var expectedWhitespaces = 11;
	var expectedUppercaseCharacterCount = 0;
	var wordsInPassphrase = exports.countPassphraseWords(passphrase);
	var whiteSpacesInPassphrase = exports.countPassphraseWhitespaces(passphrase);
	var uppercaseCharacterInPassphrase = exports.countUppercaseCharacters(
		passphrase,
	);
	var passphraseWordError = {
		actual: wordsInPassphrase,
		code: 'INVALID_AMOUNT_OF_WORDS',
		expected: expectedWords,
		message:
			'Passphrase contains ' +
			wordsInPassphrase +
			' words instead of expected ' +
			expectedWords +
			'. Please check the passphrase.',
	};
	var whiteSpaceError = {
		actual: whiteSpacesInPassphrase,
		code: 'INVALID_AMOUNT_OF_WHITESPACES',
		expected: expectedWhitespaces,
		location: exports.locateConsecutiveWhitespaces(passphrase),
		message:
			'Passphrase contains ' +
			whiteSpacesInPassphrase +
			' whitespaces instead of expected ' +
			expectedWhitespaces +
			'. Please check the passphrase.',
	};
	var uppercaseCharacterError = {
		actual: uppercaseCharacterInPassphrase,
		code: 'INVALID_AMOUNT_OF_UPPERCASE_CHARACTER',
		expected: expectedUppercaseCharacterCount,
		location: exports.locateUppercaseCharacters(passphrase),
		message:
			'Passphrase contains ' +
			uppercaseCharacterInPassphrase +
			' uppercase character instead of expected ' +
			expectedUppercaseCharacterCount +
			'. Please check the passphrase.',
	};
	var validationError = {
		actual: false,
		code: 'INVALID_MNEMONIC',
		expected: true,
		message:
			'Passphrase is not a valid mnemonic passphrase. Please check the passphrase.',
	};
	var errors = [
		passphraseWordError,
		whiteSpaceError,
		uppercaseCharacterError,
		validationError,
	];
	var wordlistArgument = [];
	var finalWordList =
		wordlists !== undefined
			? wordlistArgument.concat(wordlists)
			: Mnemonic.wordlists.english;
	return errors.reduce(function(errorArray, element) {
		if (
			element.code === 'INVALID_AMOUNT_OF_WORDS' &&
			wordsInPassphrase !== expectedWords
		) {
			return errorArray.concat([element]);
		} else if (
			element.code === 'INVALID_AMOUNT_OF_WHITESPACES' &&
			whiteSpacesInPassphrase > expectedWhitespaces
		) {
			return errorArray.concat([element]);
		} else if (
			element.code === 'INVALID_AMOUNT_OF_UPPERCASE_CHARACTER' &&
			uppercaseCharacterInPassphrase !== expectedUppercaseCharacterCount
		) {
			return errorArray.concat([element]);
		} else if (
			element.code === 'INVALID_MNEMONIC' &&
			!Mnemonic.validateMnemonic(passphrase, finalWordList)
		) {
			return errorArray.concat([element]);
		} else {
			return errorArray;
		}
	}, []);
};
//# sourceMappingURL=validation.js.map
