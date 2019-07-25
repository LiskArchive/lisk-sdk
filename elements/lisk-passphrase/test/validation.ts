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
import { expect } from 'chai';
import {
	countPassphraseWhitespaces,
	countPassphraseWords,
	countUppercaseCharacters,
	getPassphraseValidationErrors,
	locateUppercaseCharacters,
	locateConsecutiveWhitespaces,
} from '../src/validation';

/* tslint:disable: no-magic-numbers */
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
		describe('given a string without uppercase character', () => {
			const testString = 'a string without uppercase character';
			it('should return an empty array', () => {
				return expect(locateUppercaseCharacters(testString)).to.be.eql([]);
			});
		});

		describe('given a string with uppercase character', () => {
			const testString = 'a String with SOME uppercase characteR';
			const uppercaseCharacters = [2, 14, 15, 16, 17, 37];
			it('should return the array with the location of the uppercase character', () => {
				return expect(locateUppercaseCharacters(testString)).to.be.eql(
					uppercaseCharacters,
				);
			});
		});
	});

	describe('locateConsecutiveWhitespaces', () => {
		describe('given a string without whitespaces', () => {
			const testString = 'abcdefghijklkmnop';
			it('should return an empty array', () => {
				return expect(locateConsecutiveWhitespaces(testString)).to.be.eql([]);
			});
		});

		describe('given a string with whitespaces', () => {
			const testString = 'abc defghijk lkmnop';
			it('should return an empty array', () => {
				return expect(locateConsecutiveWhitespaces(testString)).to.be.eql([]);
			});
		});

		describe('given a string with a whitespace in the beginning', () => {
			const testString = ' abc defghijk lkmnop';
			const expectedWhitespaceLocation = [0];
			it('should return the array with the location of the whitespace', () => {
				return expect(locateConsecutiveWhitespaces(testString)).to.be.eql(
					expectedWhitespaceLocation,
				);
			});
		});

		describe('given a string with a whitespace in the end', () => {
			const testString = 'abc defghijk lkmnop ';
			const expectedWhitespaceLocation = [19];
			it('should return the array with the location of the whitespace', () => {
				return expect(locateConsecutiveWhitespaces(testString)).to.be.eql(
					expectedWhitespaceLocation,
				);
			});
		});

		describe('given a string with extra whitespaces', () => {
			const testString = 'abc  defghijk  lkmnop ';
			const expectedWhitespaceLocation = [4, 14, 21];
			it('should return the array with the location of the whitespaces', () => {
				return expect(locateConsecutiveWhitespaces(testString)).to.be.eql(
					expectedWhitespaceLocation,
				);
			});
		});

		describe('given a string with extra whitespaces with special characters', () => {
			const testString = 'abc  defghijk\t \nlkmnop \u00A0';
			const expectedWhitespaceLocation = [4, 14, 15, 23];
			it('should return the array with the location of the whitespaces', () => {
				return expect(locateConsecutiveWhitespaces(testString)).to.be.eql(
					expectedWhitespaceLocation,
				);
			});
		});
	});

	describe('getPassphraseValidationErrors', () => {
		describe('given a valid passphrase', () => {
			const passphrase =
				'model actor shallow eight glue upper seat lobster reason label enlist bridge';

			it('should return an empty array', () => {
				return expect(getPassphraseValidationErrors(passphrase)).to.be.eql([]);
			});
		});

		describe('given a passphrase with valid 15 words passphrase', () => {
			const passphrase =
				'post dumb recycle buddy round normal scrap better people corn crystal again never shrimp kidney';

			it('should return an array with the errors when validating with default expectedWords', () => {
				const errors = [
					{
						actual: 15,
						code: 'INVALID_AMOUNT_OF_WORDS',
						expected: 12,
						message:
							'Passphrase contains 15 words instead of expected 12. Please check the passphrase.',
					},
					{
						actual: 14,
						code: 'INVALID_AMOUNT_OF_WHITESPACES',
						expected: 11,
						location: [],
						message:
							'Passphrase contains 14 whitespaces instead of expected 11. Please check the passphrase.',
					},
				];
				return expect(getPassphraseValidationErrors(passphrase)).to.be.eql(
					errors,
				);
			});

			it('should return an array with the errors when validating with lower expectedWords', () => {
				const errors = [
					{
						actual: 15,
						code: 'INVALID_AMOUNT_OF_WORDS',
						expected: 12,
						message:
							'Passphrase contains 15 words instead of expected 12. Please check the passphrase.',
					},
					{
						actual: 14,
						code: 'INVALID_AMOUNT_OF_WHITESPACES',
						expected: 11,
						location: [],
						message:
							'Passphrase contains 14 whitespaces instead of expected 11. Please check the passphrase.',
					},
				];
				return expect(
					getPassphraseValidationErrors(passphrase, undefined, 12),
				).to.be.eql(errors);
			});

			it('should return an array with the errors when validating with higher expectedWords', () => {
				const errors = [
					{
						actual: 15,
						code: 'INVALID_AMOUNT_OF_WORDS',
						expected: 18,
						message:
							'Passphrase contains 15 words instead of expected 18. Please check the passphrase.',
					},
					{
						actual: 14,
						code: 'INVALID_AMOUNT_OF_WHITESPACES',
						expected: 17,
						location: [],
						message:
							'Passphrase contains 14 whitespaces instead of expected 17. Please check the passphrase.',
					},
				];
				return expect(
					getPassphraseValidationErrors(
						passphrase,
						Mnemonic.wordlists.english,
						18,
					),
				).to.be.eql(errors);
			});

			it('should return an empty array when validating with exact expectedWords', () => {
				return expect(
					getPassphraseValidationErrors(passphrase, undefined, 15),
				).to.be.eql([]);
			});
		});

		describe('given a passphrase with an extra whitespace in the beginning', () => {
			const passphrase =
				' model actor shallow eight glue upper seat lobster reason label enlist bridge';
			const passphraseInvalidMnemonicErrors = [
				{
					actual: 12,
					code: 'INVALID_AMOUNT_OF_WHITESPACES',
					expected: 11,
					location: [0],
					message:
						'Passphrase contains 12 whitespaces instead of expected 11. Please check the passphrase.',
				},
				{
					actual: false,
					code: 'INVALID_MNEMONIC',
					expected: true,
					message:
						'Passphrase is not a valid mnemonic passphrase. Please check the passphrase.',
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
					actual: 12,
					code: 'INVALID_AMOUNT_OF_WHITESPACES',
					expected: 11,
					location: [76],
					message:
						'Passphrase contains 12 whitespaces instead of expected 11. Please check the passphrase.',
				},
				{
					actual: false,
					code: 'INVALID_MNEMONIC',
					expected: true,
					message:
						'Passphrase is not a valid mnemonic passphrase. Please check the passphrase.',
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
					actual: 13,
					code: 'INVALID_AMOUNT_OF_WHITESPACES',
					expected: 11,
					location: [31, 43],
					message:
						'Passphrase contains 13 whitespaces instead of expected 11. Please check the passphrase.',
				},
				{
					actual: false,
					code: 'INVALID_MNEMONIC',
					expected: true,
					message:
						'Passphrase is not a valid mnemonic passphrase. Please check the passphrase.',
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
					actual: 3,
					code: 'INVALID_AMOUNT_OF_UPPERCASE_CHARACTER',
					expected: 0,
					location: [3, 38, 53],
					message:
						'Passphrase contains 3 uppercase character instead of expected 0. Please check the passphrase.',
				},
				{
					actual: false,
					code: 'INVALID_MNEMONIC',
					expected: true,
					message:
						'Passphrase is not a valid mnemonic passphrase. Please check the passphrase.',
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
					actual: false,
					code: 'INVALID_MNEMONIC',
					expected: true,
					message:
						'Passphrase is not a valid mnemonic passphrase. Please check the passphrase.',
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
				).to.be.eql([]);
			});
		});

		describe('given a passphrase that uses a different wordlist for the passphrase', () => {
			const wordlist = Mnemonic.wordlists.spanish;
			const passphrase =
				'model actor shallow eight glue upper seat lobster reason label enlist bridge';
			const passphraseInvalidMnemonicError = [
				{
					actual: false,
					code: 'INVALID_MNEMONIC',
					expected: true,
					message:
						'Passphrase is not a valid mnemonic passphrase. Please check the passphrase.',
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
