/*
 * Copyright © 2017 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */
import Mnemonic from 'bip39';

export const countPassphraseWhitespaces = passphrase => {
	const whitespaceMatches = passphrase.match(/\s/g);
	return whitespaceMatches ? whitespaceMatches.length : 0;
};

export const countPassphraseWords = passphrase =>
	passphrase.split(' ').filter(Boolean).length;

export const countUppercaseCharacters = passphrase => {
	const uppercaseCharacterMatches = passphrase.match(/[A-Z]/g) || [];
	return uppercaseCharacterMatches.length;
};

export const validatePassphrase = (passphrase, wordlist) => {
	const expectedWords = 12;
	const expectedWhitespaces = 11;
	const expectedUppercaseCharacterCount = 0;
	const wordsInPassphrase = countPassphraseWords(passphrase);
	const whiteSpacesInPassphrase = countPassphraseWhitespaces(passphrase);
	const uppercaseCharacterInPassphrase = countUppercaseCharacters(passphrase);
	const errors = [];

	if (wordsInPassphrase !== expectedWords) {
		const passphraseWordError = {
			code: 'INVALID_AMOUNT_OF_WORDS',
			message: `Passphrase contains ${wordsInPassphrase} words instead of expected ${expectedWords}. Please check the passphrase.`,
			expected: expectedWords,
			actual: wordsInPassphrase,
		};
		errors.push(passphraseWordError);
	}

	if (whiteSpacesInPassphrase !== expectedWhitespaces) {
		const whiteSpaceError = {
			code: 'INVALID_AMOUNT_OF_WHITESPACES',
			message: `Passphrase contains ${whiteSpacesInPassphrase} whitespaces instead of expected ${expectedWhitespaces}. Please check the passphrase.`,
			expected: expectedWhitespaces,
			actual: whiteSpacesInPassphrase,
		};
		errors.push(whiteSpaceError);
	}

	if (uppercaseCharacterInPassphrase !== expectedUppercaseCharacterCount) {
		const uppercaseCharacterError = {
			code: 'INVALID_AMOUNT_OF_UPPERCASE_CHARACTER',
			message: `Passphrase contains ${uppercaseCharacterInPassphrase} uppercase character instead of expected ${expectedUppercaseCharacterCount}. Please check the passphrase.`,
			expected: expectedUppercaseCharacterCount,
			actual: uppercaseCharacterInPassphrase,
		};
		errors.push(uppercaseCharacterError);
	}

	if (
		!Mnemonic.validateMnemonic(
			passphrase,
			wordlist || Mnemonic.wordlists.english,
		)
	) {
		const validationError = {
			code: 'INVALID_MNEMONIC',
			message:
				'Passphrase is not a valid mnemonic passphrase. Please check the passphrase.',
			expected: true,
			actual: false,
		};
		errors.push(validationError);
	}

	return errors;
};
