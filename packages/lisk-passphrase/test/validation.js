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
import {
	countUppercaseCharacters,
	countPassphraseWhitespaces,
	countPassphraseWords,
	getPassphraseValidationErrors,
	locateUppercaseCharacters,
	locateConsecutiveWhitespaces,
} from '../src/validation';

describe('passphrase validation', () => {
	describe('countPassphraseWhitespaces', () => {
		describe('given a valid passphrase', () => {
			const expectedAmountOfWhitespaces = 11;
			const passphrase =
				'model actor shallow eight glue upper seat lobster reason label enlist bridge';

			it('should return the expected amount of whitespaces', () => {
				return expect(countPassphraseWhitespaces(passphrase)).to.be.equal(
					expectedAmountOfWhitespaces,
				);
			});
		});

		describe('given a passphrase with an extra whitespace at the end', () => {
			const expectedAmountOfWhitespaces = 12;
			const passphrase =
				'model actor shallow eight glue upper seat lobster reason label enlist bridge ';

			it('should return the expected amount of whitespaces', () => {
				return expect(countPassphraseWhitespaces(passphrase)).to.be.equal(
					expectedAmountOfWhitespaces,
				);
			});
		});

		describe('given a passphrase with an extra whitespace at the beginning', () => {
			const expectedAmountOfWhitespaces = 12;
			const passphrase =
				' model actor shallow eight glue upper seat lobster reason label enlist bridge';

			it('should return the expected amount of whitespaces', () => {
				return expect(countPassphraseWhitespaces(passphrase)).to.be.equal(
					expectedAmountOfWhitespaces,
				);
			});
		});

		describe('given a passphrase with extra whitespaces between the first words', () => {
			const expectedAmountOfWhitespaces = 12;
			const passphrase =
				'model  actor shallow eight glue upper seat lobster reason label enlist bridge';

			it('should return the expected amount of whitespaces', () => {
				return expect(countPassphraseWhitespaces(passphrase)).to.be.equal(
					expectedAmountOfWhitespaces,
				);
			});
		});

		describe('given a passphrase with extra whitespaces between all words', () => {
			const expectedAmountOfWhitespaces = 22;
			const passphrase =
				'model  actor  shallow  eight  glue  upper  seat  lobster  reason  label  enlist  bridge';

			it('should return the expected amount of whitespaces', () => {
				return expect(countPassphraseWhitespaces(passphrase)).to.be.equal(
					expectedAmountOfWhitespaces,
				);
			});
		});

		describe('given a passphrase with tab in the beginning', () => {
			const expectedAmountOfWhitespaces = 12;
			const passphrase =
				'\tmodel actor shallow eight glue upper seat lobster reason label enlist bridge';

			it('should return the expected amount of whitespaces', () => {
				return expect(countPassphraseWhitespaces(passphrase)).to.be.equal(
					expectedAmountOfWhitespaces,
				);
			});
		});

		describe('given a passphrase with vertical tab in the beginning', () => {
			const expectedAmountOfWhitespaces = 12;
			const passphrase =
				'\vmodel actor shallow eight glue upper seat lobster reason label enlist bridge';

			it('should return the expected amount of whitespaces', () => {
				return expect(countPassphraseWhitespaces(passphrase)).to.be.equal(
					expectedAmountOfWhitespaces,
				);
			});
		});

		describe('given a passphrase with form feed in the beginning', () => {
			const expectedAmountOfWhitespaces = 12;
			const passphrase =
				'\fmodel actor shallow eight glue upper seat lobster reason label enlist bridge';

			it('should return the expected amount of whitespaces', () => {
				return expect(countPassphraseWhitespaces(passphrase)).to.be.equal(
					expectedAmountOfWhitespaces,
				);
			});
		});

		describe('given a passphrase with nonbreaking space in the beginning', () => {
			const expectedAmountOfWhitespaces = 12;
			const passphrase =
				'\u00A0model actor shallow eight glue upper seat lobster reason label enlist bridge';

			it('should return the expected amount of whitespaces', () => {
				return expect(countPassphraseWhitespaces(passphrase)).to.be.equal(
					expectedAmountOfWhitespaces,
				);
			});
		});

		describe('given a passphrase with byte order mark in the beginning', () => {
			const expectedAmountOfWhitespaces = 12;
			const passphrase =
				'\uFEFFmodel actor shallow eight glue upper seat lobster reason label enlist bridge';

			it('should return the expected amount of whitespaces', () => {
				return expect(countPassphraseWhitespaces(passphrase)).to.be.equal(
					expectedAmountOfWhitespaces,
				);
			});
		});

		describe('given a passphrase with no whitespaces', () => {
			const expectedAmountOfWhitespaces = 0;
			const passphrase =
				'modelactorshalloweightglueupperseatlobsterreasonlabelenlistbridge';

			it('should return the expected amount of whitespaces', () => {
				return expect(countPassphraseWhitespaces(passphrase)).to.be.equal(
					expectedAmountOfWhitespaces,
				);
			});
		});
	});

	describe('countPassphraseWords', () => {
		describe('given a valid passphrase', () => {
			const expectedAmountOfWords = 12;
			const passphrase =
				'model actor shallow eight glue upper seat lobster reason label enlist bridge';

			it('should return the amount of words', () => {
				return expect(countPassphraseWords(passphrase)).to.be.equal(
					expectedAmountOfWords,
				);
			});
		});

		describe('given a passphrase with 13 words', () => {
			const expectedAmountOfWords = 13;
			const passphrase =
				'model actor shallow eight glue upper seat lobster reason label enlist bridge model';

			it('should return the amount of words', () => {
				return expect(countPassphraseWords(passphrase)).to.be.equal(
					expectedAmountOfWords,
				);
			});
		});

		describe('given a passphrase with 9 words', () => {
			const expectedAmountOfWords = 9;
			const passphrase =
				'model actor shallow eight glue upper seat lobster reason';

			it('should return the amount of words', () => {
				return expect(countPassphraseWords(passphrase)).to.be.equal(
					expectedAmountOfWords,
				);
			});
		});

		describe('given a passphrase with 12 words and extra whitespaces', () => {
			const expectedAmountOfWords = 12;
			const passphrase =
				'model  actor  shallow  eight glue upper seat lobster reason label enlist bridge';

			it('should ignore the whitespaces and return the amount of words', () => {
				return expect(countPassphraseWords(passphrase)).to.be.equal(
					expectedAmountOfWords,
				);
			});
		});

		describe('given a passphrase with no words but whitespaces', () => {
			const expectedAmountOfWords = 0;
			const passphrase = '     ';

			it('should ignore the whitespaces and return the amount of words', () => {
				return expect(countPassphraseWords(passphrase)).to.be.equal(
					expectedAmountOfWords,
				);
			});
		});

		describe('given an empty string passphrase', () => {
			const expectedAmountOfWords = 0;
			const passphrase = '';

			it('should return the amount of words', () => {
				return expect(countPassphraseWords(passphrase)).to.be.equal(
					expectedAmountOfWords,
				);
			});
		});
	});

	describe('countUppercaseCharacters', () => {
		describe('given a passphrase without uppercase character', () => {
			const expectedAmountUppercaseCharacter = 0;
			const passphrase =
				'model actor shallow eight glue upper seat lobster reason label enlist bridge';

			it('should return the number of uppercase characters', () => {
				const uppercased = countUppercaseCharacters(passphrase);
				return expect(uppercased).to.be.equal(expectedAmountUppercaseCharacter);
			});
		});

		describe('given a passphrase with uppercase character', () => {
			const expectedAmountOfCapitalCharacters = 4;
			const passphrase =
				'Model Actor shallow eight glue upPer seat lobSter reason label enlist bridge';

			it('should return the amount of uppercase character', () => {
				const uppercased = countUppercaseCharacters(passphrase);
				return expect(uppercased).to.be.equal(
					expectedAmountOfCapitalCharacters,
				);
			});
		});

		describe('given a passphrase with all uppercase character', () => {
			const expectedAmountOfCapitalCharacters = 65;
			const passphrase =
				'MODEL ACTOR SHALLOW EIGHT GLUE UPPER SEAT LOBSTER REASON LABEL ENLIST BRIDGE';

			it('should return the amount of uppercase character', () => {
				return expect(countUppercaseCharacters(passphrase)).to.be.equal(
					expectedAmountOfCapitalCharacters,
				);
			});
		});
	});

	describe('locateUppercaseCharacters', () => {
		const emptyArray = [];
		describe('given a string without uppercase character', () => {
			const string = 'a string without uppercase character';
			it('should return an empty array', () => {
				return expect(locateUppercaseCharacters(string)).to.be.eql(emptyArray);
			});
		});

		describe('given a string with uppercase character', () => {
			const string = 'a String with SOME uppercase characteR';
			const uppercaseCharacters = [2, 14, 15, 16, 17, 37];
			it('should return the array with the location of the uppercase character', () => {
				return expect(locateUppercaseCharacters(string)).to.be.eql(
					uppercaseCharacters,
				);
			});
		});
	});

	describe('locateConsecutiveWhitespaces', () => {
		const emptyArray = [];
		describe('given a string without whitespaces', () => {
			const string = 'abcdefghijklkmnop';
			it('should return an empty array', () => {
				return expect(locateConsecutiveWhitespaces(string)).to.be.eql(
					emptyArray,
				);
			});
		});

		describe('given a string with whitespaces', () => {
			const string = 'abc defghijk lkmnop';
			it('should return an empty array', () => {
				return expect(locateConsecutiveWhitespaces(string)).to.be.eql(
					emptyArray,
				);
			});
		});

		describe('given a string with a whitespace in the beginning', () => {
			const string = ' abc defghijk lkmnop';
			const expectedWhitespaceLocation = [0];
			it('should return the array with the location of the whitespace', () => {
				return expect(locateConsecutiveWhitespaces(string)).to.be.eql(
					expectedWhitespaceLocation,
				);
			});
		});

		describe('given a string with a whitespace in the end', () => {
			const string = 'abc defghijk lkmnop ';
			const expectedWhitespaceLocation = [19];
			it('should return the array with the location of the whitespace', () => {
				return expect(locateConsecutiveWhitespaces(string)).to.be.eql(
					expectedWhitespaceLocation,
				);
			});
		});

		describe('given a string with extra whitespaces', () => {
			const string = 'abc  defghijk  lkmnop ';
			const expectedWhitespaceLocation = [4, 14, 21];
			it('should return the array with the location of the whitespaces', () => {
				return expect(locateConsecutiveWhitespaces(string)).to.be.eql(
					expectedWhitespaceLocation,
				);
			});
		});

		describe('given a string with extra whitespaces with special characters', () => {
			const string = 'abc  defghijk\t \nlkmnop \u00A0';
			const expectedWhitespaceLocation = [4, 14, 15, 23];
			it('should return the array with the location of the whitespaces', () => {
				return expect(locateConsecutiveWhitespaces(string)).to.be.eql(
					expectedWhitespaceLocation,
				);
			});
		});
	});

	describe('getPassphraseValidationErrors', () => {
		const emptyErrorArray = [];

		describe('given a valid passphrase', () => {
			const passphrase =
				'model actor shallow eight glue upper seat lobster reason label enlist bridge';

			it('should return an empty array', () => {
				return expect(getPassphraseValidationErrors(passphrase)).to.be.eql(
					emptyErrorArray,
				);
			});
		});

		describe('given a passphrase with too many words', () => {
			const passphrase =
				'model actor shallow eight glue upper seat lobster reason label enlist bridge actor';

			const passphraseTooManyWordsErrors = [
				{
					code: 'INVALID_AMOUNT_OF_WORDS',
					message:
						'Passphrase contains 13 words instead of expected 12. Please check the passphrase.',
					expected: 12,
					actual: 13,
				},
				{
					code: 'INVALID_AMOUNT_OF_WHITESPACES',
					message:
						'Passphrase contains 12 whitespaces instead of expected 11. Please check the passphrase.',
					expected: 11,
					actual: 12,
					location: [],
				},
				{
					code: 'INVALID_MNEMONIC',
					message:
						'Passphrase is not a valid mnemonic passphrase. Please check the passphrase.',
					expected: true,
					actual: false,
				},
			];

			it('should return the array with the errors', () => {
				return expect(getPassphraseValidationErrors(passphrase)).to.be.eql(
					passphraseTooManyWordsErrors,
				);
			});
		});

		describe('given a passphrase with too few words', () => {
			const passphrase =
				'model actor shallow eight glue upper seat lobster reason label enlist';
			const passphraseTooFewWordsErrors = [
				{
					code: 'INVALID_AMOUNT_OF_WORDS',
					message:
						'Passphrase contains 11 words instead of expected 12. Please check the passphrase.',
					expected: 12,
					actual: 11,
				},
				{
					code: 'INVALID_MNEMONIC',
					message:
						'Passphrase is not a valid mnemonic passphrase. Please check the passphrase.',
					expected: true,
					actual: false,
				},
			];

			it('should return the array with the errors', () => {
				return expect(getPassphraseValidationErrors(passphrase)).to.be.eql(
					passphraseTooFewWordsErrors,
				);
			});
		});

		describe('given a passphrase with an extra whitespace in the beginning', () => {
			const passphrase =
				' model actor shallow eight glue upper seat lobster reason label enlist bridge';
			const passphraseInvalidMnemonicErrors = [
				{
					code: 'INVALID_AMOUNT_OF_WHITESPACES',
					message:
						'Passphrase contains 12 whitespaces instead of expected 11. Please check the passphrase.',
					expected: 11,
					actual: 12,
					location: [0],
				},
				{
					code: 'INVALID_MNEMONIC',
					message:
						'Passphrase is not a valid mnemonic passphrase. Please check the passphrase.',
					expected: true,
					actual: false,
				},
			];

			it('should return the array with the errors', () => {
				return expect(getPassphraseValidationErrors(passphrase)).to.be.eql(
					passphraseInvalidMnemonicErrors,
				);
			});
		});

		describe('given a passphrase with an extra whitespace in the end', () => {
			const passphrase =
				'model actor shallow eight glue upper seat lobster reason label enlist bridge ';
			const passphraseInvalidMnemonicErrors = [
				{
					code: 'INVALID_AMOUNT_OF_WHITESPACES',
					message:
						'Passphrase contains 12 whitespaces instead of expected 11. Please check the passphrase.',
					expected: 11,
					actual: 12,
					location: [76],
				},
				{
					code: 'INVALID_MNEMONIC',
					message:
						'Passphrase is not a valid mnemonic passphrase. Please check the passphrase.',
					expected: true,
					actual: false,
				},
			];

			it('should return the array with the errors', () => {
				return expect(getPassphraseValidationErrors(passphrase)).to.be.eql(
					passphraseInvalidMnemonicErrors,
				);
			});
		});

		describe('given a passphrase with too many whitespaces in between words', () => {
			const passphrase =
				'model actor shallow eight glue  upper seat  lobster reason label enlist bridge';
			const passphraseInvalidMnemonicErrors = [
				{
					code: 'INVALID_AMOUNT_OF_WHITESPACES',
					message:
						'Passphrase contains 13 whitespaces instead of expected 11. Please check the passphrase.',
					expected: 11,
					actual: 13,
					location: [31, 43],
				},
				{
					code: 'INVALID_MNEMONIC',
					message:
						'Passphrase is not a valid mnemonic passphrase. Please check the passphrase.',
					expected: true,
					actual: false,
				},
			];

			it('should return the array with the errors', () => {
				return expect(getPassphraseValidationErrors(passphrase)).to.be.eql(
					passphraseInvalidMnemonicErrors,
				);
			});
		});

		describe('given a passphrase with uppercase characters', () => {
			const passphrase =
				'modEl actor shallow eight glue upper sEat lobster reaSon label enlist bridge';
			const passphraseWithUppercaseCharacterErrors = [
				{
					code: 'INVALID_AMOUNT_OF_UPPERCASE_CHARACTER',
					message:
						'Passphrase contains 3 uppercase character instead of expected 0. Please check the passphrase.',
					expected: 0,
					actual: 3,
					location: [3, 38, 53],
				},
				{
					code: 'INVALID_MNEMONIC',
					message:
						'Passphrase is not a valid mnemonic passphrase. Please check the passphrase.',
					expected: true,
					actual: false,
				},
			];

			it('should return the array with the errors', () => {
				return expect(getPassphraseValidationErrors(passphrase)).to.be.eql(
					passphraseWithUppercaseCharacterErrors,
				);
			});
		});

		describe('given a passphrase that is an invalid mnemonic passphrase', () => {
			const passphrase =
				'model actor shallow eight glue upper seat lobster reason label engage bridge';
			const passphraseInvalidMnemonicError = [
				{
					code: 'INVALID_MNEMONIC',
					message:
						'Passphrase is not a valid mnemonic passphrase. Please check the passphrase.',
					expected: true,
					actual: false,
				},
			];

			it('should return the array with the error', () => {
				return expect(getPassphraseValidationErrors(passphrase)).to.be.eql(
					passphraseInvalidMnemonicError,
				);
			});
		});

		describe('given a passphrase that uses the correct wordlist for the passphrase', () => {
			const wordlist = Mnemonic.wordlists.english;
			const passphrase =
				'model actor shallow eight glue upper seat lobster reason label enlist bridge';

			it('should return an empty array', () => {
				return expect(
					getPassphraseValidationErrors(passphrase, wordlist),
				).to.be.eql(emptyErrorArray);
			});
		});

		describe('given a passphrase that uses a different wordlist for the passphrase', () => {
			const wordlist = Mnemonic.wordlists.spanish;
			const passphrase =
				'model actor shallow eight glue upper seat lobster reason label enlist bridge';
			const passphraseInvalidMnemonicError = [
				{
					code: 'INVALID_MNEMONIC',
					message:
						'Passphrase is not a valid mnemonic passphrase. Please check the passphrase.',
					expected: true,
					actual: false,
				},
			];

			it('should return the array with the error', () => {
				return expect(
					getPassphraseValidationErrors(passphrase, wordlist),
				).to.be.eql(passphraseInvalidMnemonicError);
			});
		});
	});
});
