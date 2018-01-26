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

const whitespaceRegExp = /\s/g;
const uppercaseRegExp = /[A-Z]/g;

export const countPassphraseWhitespaces = passphrase => {
	const whitespaceMatches = passphrase.match(whitespaceRegExp);
	return whitespaceMatches ? whitespaceMatches.length : 0;
};

export const countPassphraseWords = passphrase =>
	passphrase.split(' ').filter(Boolean).length;

export const countUppercaseCharacters = passphrase => {
	const uppercaseCharacterMatches = passphrase.match(uppercaseRegExp) || [];
	return uppercaseCharacterMatches.length;
};

export const locateUppercaseCharacters = passphrase => {
	const positions = [];
	for (let i = 0; i < passphrase.length; i += 1) {
		if (passphrase[i].match(uppercaseRegExp) !== null) {
			positions.push(i);
		}
	}
	return positions;
};

export const locateWhitespaces = passphrase => {
	const positions = [];
	const passphraseLength = passphrase.length;
	const lastIndex = passphraseLength - 1;
	if (passphrase[0].match(whitespaceRegExp) !== null) {
		positions.push(0);
	}

	for (let i = 1; i < lastIndex; i += 1) {
		if (
			passphrase[i].match(whitespaceRegExp) &&
			passphrase[i - 1].match(whitespaceRegExp)
		) {
			positions.push(i);
		}
	}

	if (passphrase[lastIndex].match(whitespaceRegExp) !== null) {
		positions.push(lastIndex);
	}

	return positions;
};

export const getPassphraseValidationErrors = (passphrase, wordlist) => {
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

	if (whiteSpacesInPassphrase > expectedWhitespaces) {
		const whiteSpaceError = {
			code: 'INVALID_AMOUNT_OF_WHITESPACES',
			message: `Passphrase contains ${whiteSpacesInPassphrase} whitespaces instead of expected ${expectedWhitespaces}. Please check the passphrase.`,
			expected: expectedWhitespaces,
			actual: whiteSpacesInPassphrase,
			location: locateWhitespaces(passphrase),
		};
		errors.push(whiteSpaceError);
	}

	if (uppercaseCharacterInPassphrase !== expectedUppercaseCharacterCount) {
		const uppercaseCharacterError = {
			code: 'INVALID_AMOUNT_OF_UPPERCASE_CHARACTER',
			message: `Passphrase contains ${uppercaseCharacterInPassphrase} uppercase character instead of expected ${expectedUppercaseCharacterCount}. Please check the passphrase.`,
			expected: expectedUppercaseCharacterCount,
			actual: uppercaseCharacterInPassphrase,
			location: locateUppercaseCharacters(passphrase),
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
