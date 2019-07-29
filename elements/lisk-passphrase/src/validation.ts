/*
 * Copyright © 2019 Lisk Foundation
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
import * as Mnemonic from 'bip39';

interface PassphraseRegularExpression {
	readonly uppercaseRegExp: RegExp;
	readonly whitespaceRegExp: RegExp;
}
interface PassphraseError {
	readonly actual: number | boolean | string;
	readonly code: string;
	readonly expected: number | boolean | string;
	readonly location?: ReadonlyArray<number>;
	readonly message: string;
}

const passphraseRegularExpression: PassphraseRegularExpression = {
	uppercaseRegExp: /[A-Z]/g,
	whitespaceRegExp: /\s/g,
};

export const countPassphraseWhitespaces = (passphrase: string): number => {
	const whitespaceMatches = passphrase.match(
		passphraseRegularExpression.whitespaceRegExp,
	);

	return whitespaceMatches !== null ? whitespaceMatches.length : 0;
};

export const countPassphraseWords = (passphrase: string): number =>
	passphrase.split(' ').filter(Boolean).length;

export const countUppercaseCharacters = (passphrase: string): number => {
	const uppercaseCharacterMatches = passphrase.match(
		passphraseRegularExpression.uppercaseRegExp,
	);

	return uppercaseCharacterMatches !== null
		? uppercaseCharacterMatches.length
		: 0;
};

export const locateUppercaseCharacters = (
	passphrase: string,
): ReadonlyArray<number> =>
	passphrase
		.split('')
		.reduce(
			(
				upperCaseIndexes: ReadonlyArray<number>,
				character: string,
				index: number,
			) => {
				if (
					character.match(passphraseRegularExpression.uppercaseRegExp) !== null
				) {
					return [...upperCaseIndexes, index];
				}

				return upperCaseIndexes;
			},
			[],
		);

export const locateConsecutiveWhitespaces = (
	passphrase: string,
): ReadonlyArray<number> =>
	passphrase
		.split('')
		.reduce(
			(
				whitespaceIndexes: ReadonlyArray<number>,
				character: string,
				index: number,
			) => {
				if (
					index === 0 &&
					character.match(passphraseRegularExpression.whitespaceRegExp) !== null
				) {
					return [...whitespaceIndexes, index];
				}
				if (
					index !== passphrase.length - 1 &&
					character.match(passphraseRegularExpression.whitespaceRegExp) !==
						null &&
					passphrase
						.split('')
						[index - 1].match(passphraseRegularExpression.whitespaceRegExp) !==
						null
				) {
					return [...whitespaceIndexes, index];
				}
				if (
					index === passphrase.length - 1 &&
					character.match(passphraseRegularExpression.whitespaceRegExp) !== null
				) {
					return [...whitespaceIndexes, index];
				}

				return whitespaceIndexes;
			},
			[],
		);

export const getPassphraseValidationErrors = (
	passphrase: string,
	wordlists?: ReadonlyArray<string>,
	expectedWords: number = 12,
): ReadonlyArray<PassphraseError> => {
	const expectedWhitespaces = expectedWords - 1;
	const expectedUppercaseCharacterCount = 0;
	const wordsInPassphrase = countPassphraseWords(passphrase);
	const whiteSpacesInPassphrase = countPassphraseWhitespaces(passphrase);
	const uppercaseCharacterInPassphrase = countUppercaseCharacters(passphrase);
	const passphraseWordError: PassphraseError = {
		actual: wordsInPassphrase,
		code: 'INVALID_AMOUNT_OF_WORDS',
		expected: expectedWords,
		message: `Passphrase contains ${wordsInPassphrase} words instead of expected ${expectedWords}. Please check the passphrase.`,
	};
	const whiteSpaceError: PassphraseError = {
		actual: whiteSpacesInPassphrase,
		code: 'INVALID_AMOUNT_OF_WHITESPACES',
		expected: expectedWhitespaces,
		location: locateConsecutiveWhitespaces(passphrase),
		message: `Passphrase contains ${whiteSpacesInPassphrase} whitespaces instead of expected ${expectedWhitespaces}. Please check the passphrase.`,
	};
	const uppercaseCharacterError: PassphraseError = {
		actual: uppercaseCharacterInPassphrase,
		code: 'INVALID_AMOUNT_OF_UPPERCASE_CHARACTER',
		expected: expectedUppercaseCharacterCount,
		location: locateUppercaseCharacters(passphrase),
		message: `Passphrase contains ${uppercaseCharacterInPassphrase} uppercase character instead of expected ${expectedUppercaseCharacterCount}. Please check the passphrase.`,
	};
	const validationError: PassphraseError = {
		actual: false,
		code: 'INVALID_MNEMONIC',
		expected: true,
		message:
			'Passphrase is not a valid mnemonic passphrase. Please check the passphrase.',
	};

	const finalWordList =
		wordlists !== undefined ? [...wordlists] : Mnemonic.wordlists.english;

	return [
		passphraseWordError,
		whiteSpaceError,
		uppercaseCharacterError,
		validationError,
	].reduce(
		(errorArray: ReadonlyArray<PassphraseError>, error: PassphraseError) => {
			if (
				error.code === passphraseWordError.code &&
				wordsInPassphrase !== expectedWords
			) {
				return [...errorArray, error];
			}
			if (
				error.code === whiteSpaceError.code &&
				whiteSpacesInPassphrase !== expectedWhitespaces
			) {
				return [...errorArray, error];
			}
			if (
				error.code === uppercaseCharacterError.code &&
				uppercaseCharacterInPassphrase !== expectedUppercaseCharacterCount
			) {
				return [...errorArray, error];
			}
			if (
				error.code === validationError.code &&
				!Mnemonic.validateMnemonic(passphrase, finalWordList)
			) {
				return [...errorArray, error];
			}

			return errorArray;
		},
		[],
	);
};
