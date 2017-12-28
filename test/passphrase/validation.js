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
import {
	countCapitalCharacters,
	countPassphraseWhitespaces,
	countPassphraseWords,
	validatePassphrase,
} from '../../src/passphrase/validation';

describe('passphrase validation', () => {
	describe('countPassphraseWhitespaces', () => {
		describe('given a valid passphrase', () => {
			const expectedAmountOfWhitespaces = 11;
			const passphrase =
				'model actor shallow eight glue upper seat lobster reason label enlist bridge';

			it('should return the expected amount of whitespaces', () => {
				countPassphraseWhitespaces(passphrase).should.be.equal(
					expectedAmountOfWhitespaces,
				);
			});
		});

		describe('given a passphrase with an extra whitespace at the end', () => {
			const expectedAmountOfWhitespaces = 12;
			const passphrase =
				'model actor shallow eight glue upper seat lobster reason label enlist bridge ';

			it('should return the expected amount of whitespaces', () => {
				countPassphraseWhitespaces(passphrase).should.be.equal(
					expectedAmountOfWhitespaces,
				);
			});
		});

		describe('given a passphrase with an extra whitespace at the beginning', () => {
			const expectedAmountOfWhitespaces = 12;
			const passphrase =
				' model actor shallow eight glue upper seat lobster reason label enlist bridge';

			it('should return the expected amount of whitespaces', () => {
				countPassphraseWhitespaces(passphrase).should.be.equal(
					expectedAmountOfWhitespaces,
				);
			});
		});

		describe('given a passphrase with extra whitespaces between the first words', () => {
			const expectedAmountOfWhitespaces = 12;
			const passphrase =
				'model  actor shallow eight glue upper seat lobster reason label enlist bridge';

			it('should return the expected amount of whitespaces', () => {
				countPassphraseWhitespaces(passphrase).should.be.equal(
					expectedAmountOfWhitespaces,
				);
			});
		});

		describe('given a passphrase with extra whitespaces between all words', () => {
			const expectedAmountOfWhitespaces = 22;
			const passphrase =
				'model  actor  shallow  eight  glue  upper  seat  lobster  reason  label  enlist  bridge';

			it('should return the expected amount of whitespaces', () => {
				countPassphraseWhitespaces(passphrase).should.be.equal(
					expectedAmountOfWhitespaces,
				);
			});
		});

		describe('given a passphrase with no whitespaces', () => {
			const expectedAmountOfWhitespaces = 0;
			const passphrase =
				'modelactorshalloweightglueupperseatlobsterreasonlabelenlistbridge';

			it('should return the expected amount of whitespaces', () => {
				countPassphraseWhitespaces(passphrase).should.be.equal(
					expectedAmountOfWhitespaces,
				);
			});
		});
	});

	describe('countPassphraseWords', () => {
		describe('given a valid passphrase', () => {
			const expextedAmountOfWords = 12;
			const passphrase =
				'model actor shallow eight glue upper seat lobster reason label enlist bridge';

			it('should return the amount of words', () => {
				countPassphraseWords(passphrase).should.be.equal(expextedAmountOfWords);
			});
		});

		describe('given a passphrase with 13 words', () => {
			const expextedAmountOfWords = 13;
			const passphrase =
				'model actor shallow eight glue upper seat lobster reason label enlist bridge model';

			it('should return the amount of words', () => {
				countPassphraseWords(passphrase).should.be.equal(expextedAmountOfWords);
			});
		});

		describe('given a passphrase with 9 words', () => {
			const expextedAmountOfWords = 9;
			const passphrase =
				'model actor shallow eight glue upper seat lobster reason';

			it('should return the amount of words', () => {
				countPassphraseWords(passphrase).should.be.equal(expextedAmountOfWords);
			});
		});

		describe('given a passphrase with 12 words and extra whitespaces', () => {
			const expextedAmountOfWords = 12;
			const passphrase =
				'model  actor  shallow  eight glue upper seat lobster reason label enlist bridge';

			it('should ignore the whitespaces and return the amount of words', () => {
				countPassphraseWords(passphrase).should.be.equal(expextedAmountOfWords);
			});
		});

		describe('given a passphrase with no words but whitespaces', () => {
			const expextedAmountOfWords = 0;
			const passphrase = '     ';

			it('should ignore the whitespaces and return the amount of words', () => {
				countPassphraseWords(passphrase).should.be.equal(expextedAmountOfWords);
			});
		});

		describe('given an empty string passphrase', () => {
			const expextedAmountOfWords = 0;
			const passphrase = '';

			it('should return the amount of words', () => {
				countPassphraseWords(passphrase).should.be.equal(expextedAmountOfWords);
			});
		});
	});

	describe('countCapitalCharacters', () => {
		describe('given a passphrase without capital letters', () => {
			const passphrase =
				'model actor shallow eight glue upper seat lobster reason label enlist bridge';

			it('should return 0', () => {
				const capitalied = countCapitalCharacters(passphrase);
				capitalied.should.be.equal(0);
			});
		});

		describe('given a passphrase with capital letters', () => {
			const expectedAmountOfCapitalCharacters = 4;
			const passphrase =
				'Model Actor shallow eight glue upPer seat lobSter reason label enlist bridge';

			it('should return the amount of capital letters', () => {
				const capitalied = countCapitalCharacters(passphrase);
				capitalied.should.be.equal(expectedAmountOfCapitalCharacters);
			});
		});

		describe('given a passphrase with all capital letters', () => {
			const expectedAmountOfCapitalCharacters = 65;
			const passphrase =
				'MODEL ACTOR SHALLOW EIGHT GLUE UPPER SEAT LOBSTER REASON LABEL ENLIST BRIDGE';

			it('should return the amount of capital letters', () => {
				countCapitalCharacters(passphrase).should.be.equal(
					expectedAmountOfCapitalCharacters,
				);
			});
		});
	});

	describe('validatePassphrase', () => {
		describe('given a valid passphrase', () => {
			const passphrase =
				'model actor shallow eight glue upper seat lobster reason label enlist bridge';

			it('should return true', () => {
				validatePassphrase(passphrase).should.be.true();
			});
		});

		describe('given a passphrase with extra words', () => {
			const passphrase =
				'model actor shallow eight glue upper seat lobster reason label enlist bridge actor';
			const errorMessage =
				'Passphrase contains 13 words instead of expected 12. Please check the passphrase.';

			it('should throw the error', () => {
				validatePassphrase.bind(null, passphrase).should.throw(errorMessage);
			});
		});

		describe('given a passphrase with less words', () => {
			const passphrase =
				'model actor shallow eight glue upper seat lobster reason label enlist';
			const errorMessage =
				'Passphrase contains 11 words instead of expected 12. Please check the passphrase.';

			it('should throw the error', () => {
				validatePassphrase.bind(null, passphrase).should.throw(errorMessage);
			});
		});

		describe('given a passphrase with one more whitespace in the beginning', () => {
			const passphrase =
				' model actor shallow eight glue upper seat lobster reason label enlist bridge';
			const errorMessage =
				'Passphrase contains 12 whitespaces instead of expected 11. Please check the passphrase.';

			it('should throw the error', () => {
				validatePassphrase.bind(null, passphrase).should.throw(errorMessage);
			});
		});

		describe('given a passphrase with one more whitespace in the end', () => {
			const passphrase =
				'model actor shallow eight glue upper seat lobster reason label enlist bridge ';
			const errorMessage =
				'Passphrase contains 12 whitespaces instead of expected 11. Please check the passphrase.';

			it('should throw the error', () => {
				validatePassphrase.bind(null, passphrase).should.throw(errorMessage);
			});
		});

		describe('given a passphrase with more whitespaces in between', () => {
			const passphrase =
				'model actor shallow eight glue  upper seat  lobster reason label enlist bridge';
			const errorMessage =
				'Passphrase contains 13 whitespaces instead of expected 11. Please check the passphrase.';

			it('should throw the error', () => {
				validatePassphrase.bind(null, passphrase).should.throw(errorMessage);
			});
		});

		describe('given a passphrase with capital characters', () => {
			const passphrase =
				'modEl actor shallow eight glue upper sEat lobster reaSon label enlist bridge';
			const errorMessage =
				'Passphrase contains 3 capital character instead of expected 0. Please check the passphrase.';

			it('should throw the error', () => {
				validatePassphrase.bind(null, passphrase).should.throw(errorMessage);
			});
		});

		describe('given a passphrase that is an invalid mnemonic passphrase', () => {
			const passphrase =
				'model actor shallow eight glue upper seat lobster reason label engage bridge';
			const errorMessage =
				'Passphrase is not a valid mnemonic passphrase. Please check the passphrase.';

			it('should throw the error', () => {
				validatePassphrase.bind(null, passphrase).should.throw(errorMessage);
			});
		});
	});
});
