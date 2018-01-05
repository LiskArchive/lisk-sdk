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
	countUppercaseCharacters,
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
			const expectedAmountOfWords = 12;
			const passphrase =
				'model actor shallow eight glue upper seat lobster reason label enlist bridge';

			it('should return the amount of words', () => {
				countPassphraseWords(passphrase).should.be.equal(expectedAmountOfWords);
			});
		});

		describe('given a passphrase with 13 words', () => {
			const expectedAmountOfWords = 13;
			const passphrase =
				'model actor shallow eight glue upper seat lobster reason label enlist bridge model';

			it('should return the amount of words', () => {
				countPassphraseWords(passphrase).should.be.equal(expectedAmountOfWords);
			});
		});

		describe('given a passphrase with 9 words', () => {
			const expectedAmountOfWords = 9;
			const passphrase =
				'model actor shallow eight glue upper seat lobster reason';

			it('should return the amount of words', () => {
				countPassphraseWords(passphrase).should.be.equal(expectedAmountOfWords);
			});
		});

		describe('given a passphrase with 12 words and extra whitespaces', () => {
			const expectedAmountOfWords = 12;
			const passphrase =
				'model  actor  shallow  eight glue upper seat lobster reason label enlist bridge';

			it('should ignore the whitespaces and return the amount of words', () => {
				countPassphraseWords(passphrase).should.be.equal(expectedAmountOfWords);
			});
		});

		describe('given a passphrase with no words but whitespaces', () => {
			const expectedAmountOfWords = 0;
			const passphrase = '     ';

			it('should ignore the whitespaces and return the amount of words', () => {
				countPassphraseWords(passphrase).should.be.equal(expectedAmountOfWords);
			});
		});

		describe('given an empty string passphrase', () => {
			const expectedAmountOfWords = 0;
			const passphrase = '';

			it('should return the amount of words', () => {
				countPassphraseWords(passphrase).should.be.equal(expectedAmountOfWords);
			});
		});
	});

	describe('countUppercaseCharacters', () => {
		describe('given a passphrase without uppercase character', () => {
			const passphrase =
				'model actor shallow eight glue upper seat lobster reason label enlist bridge';

			it('should return 0', () => {
				const uppercased = countUppercaseCharacters(passphrase);
				uppercased.should.be.equal(0);
			});
		});

		describe('given a passphrase with uppercase character', () => {
			const expectedAmountOfCapitalCharacters = 4;
			const passphrase =
				'Model Actor shallow eight glue upPer seat lobSter reason label enlist bridge';

			it('should return the amount of uppercase character', () => {
				const uppercased = countUppercaseCharacters(passphrase);
				uppercased.should.be.equal(expectedAmountOfCapitalCharacters);
			});
		});

		describe('given a passphrase with all uppercase character', () => {
			const expectedAmountOfCapitalCharacters = 65;
			const passphrase =
				'MODEL ACTOR SHALLOW EIGHT GLUE UPPER SEAT LOBSTER REASON LABEL ENLIST BRIDGE';

			it('should return the amount of uppercase character', () => {
				countUppercaseCharacters(passphrase).should.be.equal(
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

		describe('given a passphrase with too many words', () => {
			const passphrase =
				'model actor shallow eight glue upper seat lobster reason label enlist bridge actor';
			const errorMessage =
				'Passphrase contains 13 words instead of expected 12. Please check the passphrase.';

			it('should throw the error', () => {
				validatePassphrase.bind(null, passphrase).should.throw(errorMessage);
			});
		});

		describe('given a passphrase with too few words', () => {
			const passphrase =
				'model actor shallow eight glue upper seat lobster reason label enlist';
			const errorMessage =
				'Passphrase contains 11 words instead of expected 12. Please check the passphrase.';

			it('should throw the error', () => {
				validatePassphrase.bind(null, passphrase).should.throw(errorMessage);
			});
		});

		describe('given a passphrase with an extra whitespace in the beginning', () => {
			const passphrase =
				' model actor shallow eight glue upper seat lobster reason label enlist bridge';
			const errorMessage =
				'Passphrase contains 12 whitespaces instead of expected 11. Please check the passphrase.';

			it('should throw the error', () => {
				validatePassphrase.bind(null, passphrase).should.throw(errorMessage);
			});
		});

		describe('given a passphrase with an extra whitespace in the end', () => {
			const passphrase =
				'model actor shallow eight glue upper seat lobster reason label enlist bridge ';
			const errorMessage =
				'Passphrase contains 12 whitespaces instead of expected 11. Please check the passphrase.';

			it('should throw the error', () => {
				validatePassphrase.bind(null, passphrase).should.throw(errorMessage);
			});
		});

		describe('given a passphrase with too many whitespaces in between words', () => {
			const passphrase =
				'model actor shallow eight glue  upper seat  lobster reason label enlist bridge';
			const errorMessage =
				'Passphrase contains 13 whitespaces instead of expected 11. Please check the passphrase.';

			it('should throw the error', () => {
				validatePassphrase.bind(null, passphrase).should.throw(errorMessage);
			});
		});

		describe('given a passphrase with uppercase characters', () => {
			const passphrase =
				'modEl actor shallow eight glue upper sEat lobster reaSon label enlist bridge';
			const errorMessage =
				'Passphrase contains 3 uppercase character instead of expected 0. Please check the passphrase.';

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
