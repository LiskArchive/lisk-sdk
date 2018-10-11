'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function(mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
exports.__esModule = true;
var bip39_1 = __importDefault(require('bip39'));
var validation_1 = require('../src/validation');
var chai_1 = require('chai');
var mocha_1 = require('mocha');
mocha_1.describe('passphrase validation', function() {
	mocha_1.describe('countPassphraseWhitespaces', function() {
		mocha_1.describe('given a valid passphrase', function() {
			var expectedAmountOfWhitespaces = 11;
			var passphrase =
				'model actor shallow eight glue upper seat lobster reason label enlist bridge';
			it('should return the expected amount of whitespaces', function() {
				return chai_1
					.expect(validation_1.countPassphraseWhitespaces(passphrase))
					.to.be.equal(expectedAmountOfWhitespaces);
			});
		});
		mocha_1.describe(
			'given a passphrase with an extra whitespace at the end',
			function() {
				var expectedAmountOfWhitespaces = 12;
				var passphrase =
					'model actor shallow eight glue upper seat lobster reason label enlist bridge ';
				it('should return the expected amount of whitespaces', function() {
					return chai_1
						.expect(validation_1.countPassphraseWhitespaces(passphrase))
						.to.be.equal(expectedAmountOfWhitespaces);
				});
			},
		);
		mocha_1.describe(
			'given a passphrase with an extra whitespace at the beginning',
			function() {
				var expectedAmountOfWhitespaces = 12;
				var passphrase =
					' model actor shallow eight glue upper seat lobster reason label enlist bridge';
				it('should return the expected amount of whitespaces', function() {
					return chai_1
						.expect(validation_1.countPassphraseWhitespaces(passphrase))
						.to.be.equal(expectedAmountOfWhitespaces);
				});
			},
		);
		mocha_1.describe(
			'given a passphrase with extra whitespaces between the first words',
			function() {
				var expectedAmountOfWhitespaces = 12;
				var passphrase =
					'model  actor shallow eight glue upper seat lobster reason label enlist bridge';
				it('should return the expected amount of whitespaces', function() {
					return chai_1
						.expect(validation_1.countPassphraseWhitespaces(passphrase))
						.to.be.equal(expectedAmountOfWhitespaces);
				});
			},
		);
		mocha_1.describe(
			'given a passphrase with extra whitespaces between all words',
			function() {
				var expectedAmountOfWhitespaces = 22;
				var passphrase =
					'model  actor  shallow  eight  glue  upper  seat  lobster  reason  label  enlist  bridge';
				it('should return the expected amount of whitespaces', function() {
					return chai_1
						.expect(validation_1.countPassphraseWhitespaces(passphrase))
						.to.be.equal(expectedAmountOfWhitespaces);
				});
			},
		);
		mocha_1.describe(
			'given a passphrase with tab in the beginning',
			function() {
				var expectedAmountOfWhitespaces = 12;
				var passphrase =
					'\tmodel actor shallow eight glue upper seat lobster reason label enlist bridge';
				it('should return the expected amount of whitespaces', function() {
					return chai_1
						.expect(validation_1.countPassphraseWhitespaces(passphrase))
						.to.be.equal(expectedAmountOfWhitespaces);
				});
			},
		);
		mocha_1.describe(
			'given a passphrase with vertical tab in the beginning',
			function() {
				var expectedAmountOfWhitespaces = 12;
				var passphrase =
					'\vmodel actor shallow eight glue upper seat lobster reason label enlist bridge';
				it('should return the expected amount of whitespaces', function() {
					return chai_1
						.expect(validation_1.countPassphraseWhitespaces(passphrase))
						.to.be.equal(expectedAmountOfWhitespaces);
				});
			},
		);
		mocha_1.describe(
			'given a passphrase with form feed in the beginning',
			function() {
				var expectedAmountOfWhitespaces = 12;
				var passphrase =
					'\fmodel actor shallow eight glue upper seat lobster reason label enlist bridge';
				it('should return the expected amount of whitespaces', function() {
					return chai_1
						.expect(validation_1.countPassphraseWhitespaces(passphrase))
						.to.be.equal(expectedAmountOfWhitespaces);
				});
			},
		);
		mocha_1.describe(
			'given a passphrase with nonbreaking space in the beginning',
			function() {
				var expectedAmountOfWhitespaces = 12;
				var passphrase =
					'\u00A0model actor shallow eight glue upper seat lobster reason label enlist bridge';
				it('should return the expected amount of whitespaces', function() {
					return chai_1
						.expect(validation_1.countPassphraseWhitespaces(passphrase))
						.to.be.equal(expectedAmountOfWhitespaces);
				});
			},
		);
		mocha_1.describe(
			'given a passphrase with byte order mark in the beginning',
			function() {
				var expectedAmountOfWhitespaces = 12;
				var passphrase =
					'\uFEFFmodel actor shallow eight glue upper seat lobster reason label enlist bridge';
				it('should return the expected amount of whitespaces', function() {
					return chai_1
						.expect(validation_1.countPassphraseWhitespaces(passphrase))
						.to.be.equal(expectedAmountOfWhitespaces);
				});
			},
		);
		mocha_1.describe('given a passphrase with no whitespaces', function() {
			var expectedAmountOfWhitespaces = 0;
			var passphrase =
				'modelactorshalloweightglueupperseatlobsterreasonlabelenlistbridge';
			it('should return the expected amount of whitespaces', function() {
				return chai_1
					.expect(validation_1.countPassphraseWhitespaces(passphrase))
					.to.be.equal(expectedAmountOfWhitespaces);
			});
		});
	});
	mocha_1.describe('countPassphraseWords', function() {
		mocha_1.describe('given a valid passphrase', function() {
			var expectedAmountOfWords = 12;
			var passphrase =
				'model actor shallow eight glue upper seat lobster reason label enlist bridge';
			it('should return the amount of words', function() {
				return chai_1
					.expect(validation_1.countPassphraseWords(passphrase))
					.to.be.equal(expectedAmountOfWords);
			});
		});
		mocha_1.describe('given a passphrase with 13 words', function() {
			var expectedAmountOfWords = 13;
			var passphrase =
				'model actor shallow eight glue upper seat lobster reason label enlist bridge model';
			it('should return the amount of words', function() {
				return chai_1
					.expect(validation_1.countPassphraseWords(passphrase))
					.to.be.equal(expectedAmountOfWords);
			});
		});
		mocha_1.describe('given a passphrase with 9 words', function() {
			var expectedAmountOfWords = 9;
			var passphrase =
				'model actor shallow eight glue upper seat lobster reason';
			it('should return the amount of words', function() {
				return chai_1
					.expect(validation_1.countPassphraseWords(passphrase))
					.to.be.equal(expectedAmountOfWords);
			});
		});
		mocha_1.describe(
			'given a passphrase with 12 words and extra whitespaces',
			function() {
				var expectedAmountOfWords = 12;
				var passphrase =
					'model  actor  shallow  eight glue upper seat lobster reason label enlist bridge';
				it('should ignore the whitespaces and return the amount of words', function() {
					return chai_1
						.expect(validation_1.countPassphraseWords(passphrase))
						.to.be.equal(expectedAmountOfWords);
				});
			},
		);
		mocha_1.describe(
			'given a passphrase with no words but whitespaces',
			function() {
				var expectedAmountOfWords = 0;
				var passphrase = '     ';
				it('should ignore the whitespaces and return the amount of words', function() {
					return chai_1
						.expect(validation_1.countPassphraseWords(passphrase))
						.to.be.equal(expectedAmountOfWords);
				});
			},
		);
		mocha_1.describe('given an empty string passphrase', function() {
			var expectedAmountOfWords = 0;
			var passphrase = '';
			it('should return the amount of words', function() {
				return chai_1
					.expect(validation_1.countPassphraseWords(passphrase))
					.to.be.equal(expectedAmountOfWords);
			});
		});
	});
	mocha_1.describe('countUppercaseCharacters', function() {
		mocha_1.describe(
			'given a passphrase without uppercase character',
			function() {
				var expectedAmountUppercaseCharacter = 0;
				var passphrase =
					'model actor shallow eight glue upper seat lobster reason label enlist bridge';
				it('should return the number of uppercase characters', function() {
					var uppercased = validation_1.countUppercaseCharacters(passphrase);
					return chai_1
						.expect(uppercased)
						.to.be.equal(expectedAmountUppercaseCharacter);
				});
			},
		);
		mocha_1.describe('given a passphrase with uppercase character', function() {
			var expectedAmountOfCapitalCharacters = 4;
			var passphrase =
				'Model Actor shallow eight glue upPer seat lobSter reason label enlist bridge';
			it('should return the amount of uppercase character', function() {
				var uppercased = validation_1.countUppercaseCharacters(passphrase);
				return chai_1
					.expect(uppercased)
					.to.be.equal(expectedAmountOfCapitalCharacters);
			});
		});
		mocha_1.describe(
			'given a passphrase with all uppercase character',
			function() {
				var expectedAmountOfCapitalCharacters = 65;
				var passphrase =
					'MODEL ACTOR SHALLOW EIGHT GLUE UPPER SEAT LOBSTER REASON LABEL ENLIST BRIDGE';
				it('should return the amount of uppercase character', function() {
					return chai_1
						.expect(validation_1.countUppercaseCharacters(passphrase))
						.to.be.equal(expectedAmountOfCapitalCharacters);
				});
			},
		);
	});
	mocha_1.describe('locateUppercaseCharacters', function() {
		mocha_1.describe('given a string without uppercase character', function() {
			var testString = 'a string without uppercase character';
			it('should return an empty array', function() {
				return chai_1
					.expect(validation_1.locateUppercaseCharacters(testString))
					.to.be.eql([]);
			});
		});
		mocha_1.describe('given a string with uppercase character', function() {
			var testString = 'a String with SOME uppercase characteR';
			var uppercaseCharacters = [2, 14, 15, 16, 17, 37];
			it('should return the array with the location of the uppercase character', function() {
				return chai_1
					.expect(validation_1.locateUppercaseCharacters(testString))
					.to.be.eql(uppercaseCharacters);
			});
		});
	});
	mocha_1.describe('locateConsecutiveWhitespaces', function() {
		mocha_1.describe('given a string without whitespaces', function() {
			var testString = 'abcdefghijklkmnop';
			it('should return an empty array', function() {
				return chai_1
					.expect(validation_1.locateConsecutiveWhitespaces(testString))
					.to.be.eql([]);
			});
		});
		mocha_1.describe('given a string with whitespaces', function() {
			var testString = 'abc defghijk lkmnop';
			it('should return an empty array', function() {
				return chai_1
					.expect(validation_1.locateConsecutiveWhitespaces(testString))
					.to.be.eql([]);
			});
		});
		mocha_1.describe(
			'given a string with a whitespace in the beginning',
			function() {
				var testString = ' abc defghijk lkmnop';
				var expectedWhitespaceLocation = [0];
				it('should return the array with the location of the whitespace', function() {
					return chai_1
						.expect(validation_1.locateConsecutiveWhitespaces(testString))
						.to.be.eql(expectedWhitespaceLocation);
				});
			},
		);
		mocha_1.describe('given a string with a whitespace in the end', function() {
			var testString = 'abc defghijk lkmnop ';
			var expectedWhitespaceLocation = [19];
			it('should return the array with the location of the whitespace', function() {
				return chai_1
					.expect(validation_1.locateConsecutiveWhitespaces(testString))
					.to.be.eql(expectedWhitespaceLocation);
			});
		});
		mocha_1.describe('given a string with extra whitespaces', function() {
			var testString = 'abc  defghijk  lkmnop ';
			var expectedWhitespaceLocation = [4, 14, 21];
			it('should return the array with the location of the whitespaces', function() {
				return chai_1
					.expect(validation_1.locateConsecutiveWhitespaces(testString))
					.to.be.eql(expectedWhitespaceLocation);
			});
		});
		mocha_1.describe(
			'given a string with extra whitespaces with special characters',
			function() {
				var testString = 'abc  defghijk\t \nlkmnop \u00A0';
				var expectedWhitespaceLocation = [4, 14, 15, 23];
				it('should return the array with the location of the whitespaces', function() {
					return chai_1
						.expect(validation_1.locateConsecutiveWhitespaces(testString))
						.to.be.eql(expectedWhitespaceLocation);
				});
			},
		);
	});
	mocha_1.describe('getPassphraseValidationErrors', function() {
		mocha_1.describe('given a valid passphrase', function() {
			var passphrase =
				'model actor shallow eight glue upper seat lobster reason label enlist bridge';
			it('should return an empty array', function() {
				return chai_1
					.expect(validation_1.getPassphraseValidationErrors(passphrase))
					.to.be.eql([]);
			});
		});
		mocha_1.describe('given a passphrase with too many words', function() {
			var passphrase =
				'model actor shallow eight glue upper seat lobster reason label enlist bridge actor';
			var passphraseTooManyWordsErrors = [
				{
					actual: 13,
					code: 'INVALID_AMOUNT_OF_WORDS',
					expected: 12,
					message:
						'Passphrase contains 13 words instead of expected 12. Please check the passphrase.',
				},
				{
					actual: 12,
					code: 'INVALID_AMOUNT_OF_WHITESPACES',
					expected: 11,
					location: [],
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
			it('should return the array with the errors', function() {
				return chai_1
					.expect(validation_1.getPassphraseValidationErrors(passphrase))
					.to.be.eql(passphraseTooManyWordsErrors);
			});
		});
		mocha_1.describe('given a passphrase with too few words', function() {
			var passphrase =
				'model actor shallow eight glue upper seat lobster reason label enlist';
			var passphraseTooFewWordsErrors = [
				{
					actual: 11,
					code: 'INVALID_AMOUNT_OF_WORDS',
					expected: 12,
					message:
						'Passphrase contains 11 words instead of expected 12. Please check the passphrase.',
				},
				{
					actual: false,
					code: 'INVALID_MNEMONIC',
					expected: true,
					message:
						'Passphrase is not a valid mnemonic passphrase. Please check the passphrase.',
				},
			];
			it('should return the array with the errors', function() {
				return chai_1
					.expect(validation_1.getPassphraseValidationErrors(passphrase))
					.to.be.eql(passphraseTooFewWordsErrors);
			});
		});
		mocha_1.describe(
			'given a passphrase with an extra whitespace in the beginning',
			function() {
				var passphrase =
					' model actor shallow eight glue upper seat lobster reason label enlist bridge';
				var passphraseInvalidMnemonicErrors = [
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
				it('should return the array with the errors', function() {
					return chai_1
						.expect(validation_1.getPassphraseValidationErrors(passphrase))
						.to.be.eql(passphraseInvalidMnemonicErrors);
				});
			},
		);
		mocha_1.describe(
			'given a passphrase with an extra whitespace in the end',
			function() {
				var passphrase =
					'model actor shallow eight glue upper seat lobster reason label enlist bridge ';
				var passphraseInvalidMnemonicErrors = [
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
				it('should return the array with the errors', function() {
					return chai_1
						.expect(validation_1.getPassphraseValidationErrors(passphrase))
						.to.be.eql(passphraseInvalidMnemonicErrors);
				});
			},
		);
		mocha_1.describe(
			'given a passphrase with too many whitespaces in between words',
			function() {
				var passphrase =
					'model actor shallow eight glue  upper seat  lobster reason label enlist bridge';
				var passphraseInvalidMnemonicErrors = [
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
				it('should return the array with the errors', function() {
					return chai_1
						.expect(validation_1.getPassphraseValidationErrors(passphrase))
						.to.be.eql(passphraseInvalidMnemonicErrors);
				});
			},
		);
		mocha_1.describe(
			'given a passphrase with uppercase characters',
			function() {
				var passphrase =
					'modEl actor shallow eight glue upper sEat lobster reaSon label enlist bridge';
				var passphraseWithUppercaseCharacterErrors = [
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
				it('should return the array with the errors', function() {
					return chai_1
						.expect(validation_1.getPassphraseValidationErrors(passphrase))
						.to.be.eql(passphraseWithUppercaseCharacterErrors);
				});
			},
		);
		mocha_1.describe(
			'given a passphrase that is an invalid mnemonic passphrase',
			function() {
				var passphrase =
					'model actor shallow eight glue upper seat lobster reason label engage bridge';
				var passphraseInvalidMnemonicError = [
					{
						actual: false,
						code: 'INVALID_MNEMONIC',
						expected: true,
						message:
							'Passphrase is not a valid mnemonic passphrase. Please check the passphrase.',
					},
				];
				it('should return the array with the error', function() {
					return chai_1
						.expect(validation_1.getPassphraseValidationErrors(passphrase))
						.to.be.eql(passphraseInvalidMnemonicError);
				});
			},
		);
		mocha_1.describe(
			'given a passphrase that uses the correct wordlist for the passphrase',
			function() {
				var wordlist = bip39_1['default'].wordlists.english;
				var passphrase =
					'model actor shallow eight glue upper seat lobster reason label enlist bridge';
				it('should return an empty array', function() {
					return chai_1
						.expect(
							validation_1.getPassphraseValidationErrors(passphrase, wordlist),
						)
						.to.be.eql([]);
				});
			},
		);
		mocha_1.describe(
			'given a passphrase that uses a different wordlist for the passphrase',
			function() {
				var wordlist = bip39_1['default'].wordlists.spanish;
				var passphrase =
					'model actor shallow eight glue upper seat lobster reason label enlist bridge';
				var passphraseInvalidMnemonicError = [
					{
						actual: false,
						code: 'INVALID_MNEMONIC',
						expected: true,
						message:
							'Passphrase is not a valid mnemonic passphrase. Please check the passphrase.',
					},
				];
				it('should return the array with the error', function() {
					return chai_1
						.expect(
							validation_1.getPassphraseValidationErrors(passphrase, wordlist),
						)
						.to.be.eql(passphraseInvalidMnemonicError);
				});
			},
		);
	});
});
//# sourceMappingURL=validation.js.map
