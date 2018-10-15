/*
 * Copyright © 2018 Lisk Foundation
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

type RegExpReturn = RegExpMatchArray | null;

const passphraseRegularExpression: PassphraseRegularExpression = {
	uppercaseRegExp: /[A-Z]/g,
	whitespaceRegExp: /\s/g,
};

export const countPassphraseWhitespaces = (passphrase: string) => {
	const whitespaceMatches: RegExpReturn = passphrase.match(
		passphraseRegularExpression.whitespaceRegExp,
	);

	return whitespaceMatches !== null ? whitespaceMatches.length : 0;
};

export const countPassphraseWords = (passphrase: string) =>
	passphrase.split(' ').filter(Boolean).length;

export const countUppercaseCharacters = (passphrase: string) => {
	const uppercaseCharacterMatches: RegExpReturn = passphrase.match(
		passphraseRegularExpression.uppercaseRegExp,
	);

	return uppercaseCharacterMatches !== null
		? uppercaseCharacterMatches.length
		: 0;
};

export const locateUppercaseCharacters = (passphrase: string) =>
	passphrase
		.split('')
		.reduce(
			(
				passphraseArray: ReadonlyArray<number>,
				element: string,
				index: number,
			) => {
				if (
					element.match(passphraseRegularExpression.uppercaseRegExp) !== null
				) {
					return [...passphraseArray, index];
				} else {
					return passphraseArray;
				}
			},
			[],
		);

export const whitespaceIndexes = (passphrase: string) =>
	passphrase
		.split('')
		.reduce(
			(
				passphraseArray: ReadonlyArray<number>,
				character: string,
				index: number,
			) => {
				if (
					index === 0 &&
					character.match(passphraseRegularExpression.whitespaceRegExp) !== null
				) {
					return [...passphraseArray, index];
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
					return [...passphraseArray, index];
				}
				if (
					index === passphrase.length - 1 &&
					character.match(passphraseRegularExpression.whitespaceRegExp) !== null
				) {
					return [...passphraseArray, index];
				}

				return passphraseArray;
			},
			[],
		);

export const getPassphraseValidationErrors = (
	passphrase: string,
	wordlists?: ReadonlyArray<string>,
) => {
	const expectedWords = 12;
	const expectedWhitespaces = 11;
	const expectedUppercaseCharacterCount = 0;
	const wordsInPassphrase: number = countPassphraseWords(passphrase);
	const whiteSpacesInPassphrase: number = countPassphraseWhitespaces(
		passphrase,
	);
	const uppercaseCharacterInPassphrase: number = countUppercaseCharacters(
		passphrase,
	);
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
		location: whitespaceIndexes(passphrase),
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
	const errors: ReadonlyArray<PassphraseError> = [
		passphraseWordError,
		whiteSpaceError,
		uppercaseCharacterError,
		validationError,
	];
	const wordlistArgument: ReadonlyArray<string> = [];
	const finalWordList =
		wordlists !== undefined
			? wordlistArgument.concat(wordlists)
			: Mnemonic.wordlists.english;

	return errors.reduce(
		(errorArray: ReadonlyArray<PassphraseError>, error: PassphraseError) => {
			if (
				error.code === 'INVALID_AMOUNT_OF_WORDS' &&
				wordsInPassphrase !== expectedWords
			) {
				return [...errorArray, error];
			}
			if (
				error.code === 'INVALID_AMOUNT_OF_WHITESPACES' &&
				whiteSpacesInPassphrase > expectedWhitespaces
			) {
				return [...errorArray, error];
			}
			if (
				error.code === 'INVALID_AMOUNT_OF_UPPERCASE_CHARACTER' &&
				uppercaseCharacterInPassphrase !== expectedUppercaseCharacterCount
			) {
				return [...errorArray, error];
			}
			if (
				error.code === 'INVALID_MNEMONIC' &&
				!Mnemonic.validateMnemonic(passphrase, finalWordList)
			) {
				return [...errorArray, error];
			}

			return errorArray;
		},
		[],
	);
};
