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
import * as BigNum from '@liskhq/bignum';
import * as cryptography from '@liskhq/lisk-cryptography';
import { expect } from 'chai';
import {
	checkPublicKeysForDuplicates,
	validatePublicKey,
	validatePublicKeys,
	validateKeysgroup,
	validateAddress,
	validateNonTransferAmount,
	validateTransferAmount,
	validateFee,
	isGreaterThanMaxTransactionAmount,
	isGreaterThanZero,
	isGreaterThanMaxTransactionId,
	isNumberString,
	isValidInteger,
	isNullByteIncluded,
} from '../../../src/utils/validation/validation';

describe('validation', () => {
	describe('#validatePublicKey', () => {
		describe('Given a hex string with odd length', () => {
			const invalidHexPublicKey =
				'215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bc';
			it('should throw an error', () => {
				return expect(
					validatePublicKey.bind(null, invalidHexPublicKey),
				).to.throw('Argument must have a valid length of hex string.');
			});
		});

		describe('Given a hex string with additional non-hex characters', () => {
			const invalidHexPublicKey =
				'12345678123456781234567812345678123456781234567812345678123456gg';
			it('should throw an error', () => {
				return expect(
					validatePublicKey.bind(null, invalidHexPublicKey),
				).to.throw('Argument must be a valid hex string.');
			});
		});

		describe('Given a too long public key', () => {
			const tooLongPublicKey =
				'215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca12';
			it('should throw an error', () => {
				return expect(validatePublicKey.bind(null, tooLongPublicKey)).to.throw(
					'Public key 215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca12 length differs from the expected 32 bytes for a public key.',
				);
			});
		});

		describe('Given a too short public key', () => {
			const tooShortPublicKey =
				'215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452b';
			it('should throw an error', () => {
				return expect(validatePublicKey.bind(null, tooShortPublicKey)).to.throw(
					'Public key 215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452b length differs from the expected 32 bytes for a public key.',
				);
			});
		});

		describe('Given a valid public key', () => {
			const publicKey =
				'215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca';
			it('should return true', () => {
				return expect(validatePublicKey(publicKey)).to.be.true;
			});
		});

		describe('Given a valid public key with only numeric characters', () => {
			const publicKey =
				'1234567812345678123456781234567812345678123456781234567812345678';
			it('should return true', () => {
				return expect(validatePublicKey(publicKey)).to.be.true;
			});
		});
	});

	describe('#validatePublicKeys', () => {
		describe('Given an array of public keys with one invalid public key', () => {
			const publicKeys = [
				'215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca',
				'215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca',
				'215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca',
				'215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bc',
			];
			it('should throw an error', () => {
				return expect(validatePublicKeys.bind(null, publicKeys)).to.throw(
					'Argument must have a valid length of hex string.',
				);
			});
		});

		describe('Given an array of valid public keys', () => {
			const publicKeys = [
				'215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca',
				'922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa',
				'1234567812345678123456781234567812345678123456781234567812345678',
			];
			it('should return true', () => {
				return expect(validatePublicKeys(publicKeys)).to.be.true;
			});
		});
	});

	describe('#validateKeysgroup', () => {
		let keysgroup: ReadonlyArray<string>;
		describe('Given a keysgroup with three public keys', () => {
			beforeEach(() => {
				keysgroup = [
					'215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca',
					'922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa',
					'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
				];
				return Promise.resolve();
			});
			it('the validated keysgroup should return true', () => {
				return expect(validateKeysgroup(keysgroup)).to.be.true;
			});
		});

		describe('Given an empty keysgroup', () => {
			beforeEach(() => {
				keysgroup = [];
				return Promise.resolve();
			});
			it('should throw the error', () => {
				return expect(validateKeysgroup.bind(null, keysgroup)).to.throw(
					'Expected between 1 and 15 public keys in the keysgroup.',
				);
			});
		});

		describe('Given a keysgroup with 17 public keys', () => {
			beforeEach(() => {
				keysgroup = new Array(17)
					.fill(0)
					.map(
						(_: number, index: number) =>
							cryptography.getPrivateAndPublicKeyFromPassphrase(
								index.toString(),
							).publicKey,
					);
				return Promise.resolve();
			});
			it('should throw the error', () => {
				return expect(validateKeysgroup.bind(null, keysgroup)).to.throw(
					'Expected between 1 and 15 public keys in the keysgroup.',
				);
			});
		});
	});

	describe('#checkPublicKeysForDuplicates', () => {
		describe('Given an array of public keys without duplication', () => {
			const publicKeys = [
				'215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca',
				'922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa',
				'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
			];
			it('should return true', () => {
				return expect(checkPublicKeysForDuplicates(publicKeys)).to.be.true;
			});
		});

		describe('Given an array of public keys with duplication', () => {
			const publicKeys = [
				'215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca',
				'922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa',
				'922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa',
			];
			it('should throw an error', () => {
				return expect(
					checkPublicKeysForDuplicates.bind(null, publicKeys),
				).to.throw(
					'Duplicated public key: 922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa.',
				);
			});
		});
	});

	describe('#validateAddress', () => {
		describe('Given valid addresses', () => {
			const addresses = [
				'13133549779353512613L',
				'18446744073709551615L',
				'1L',
			];

			it('should return true', () => {
				return addresses.forEach(address => {
					return expect(validateAddress(address)).to.be.true;
				});
			});
		});

		describe('Given an address that is too short', () => {
			const address = 'L';
			it('should throw an error', () => {
				return expect(validateAddress.bind(null, address)).to.throw(
					'Address length does not match requirements. Expected between 2 and 22 characters.',
				);
			});
		});

		describe('Given an address that is too long', () => {
			const address = '12345678901234567890123L';
			it('should throw an error', () => {
				return expect(validateAddress.bind(null, address)).to.throw(
					'Address length does not match requirements. Expected between 2 and 22 characters.',
				);
			});
		});

		describe('Given an address without L at the end', () => {
			const address = '1234567890';
			it('should throw an error', () => {
				return expect(validateAddress.bind(null, address)).to.throw(
					'Address format does not match requirements. Expected "L" at the end.',
				);
			});
		});

		describe('Given an address that includes `.`', () => {
			const address = '14.15133512790761431L';
			it('should throw an error', () => {
				return expect(validateAddress.bind(null, address)).to.throw(
					'Address format does not match requirements. Address includes invalid character: `.`.',
				);
			});
		});

		describe('Given an address that is out of range', () => {
			const address = '18446744073709551616L';
			it('should throw an error', () => {
				return expect(validateAddress.bind(null, address)).to.throw(
					'Address format does not match requirements. Address out of maximum range.',
				);
			});
		});

		describe('Given an address that has leading zeros', () => {
			const address = '00015133512790761431L';
			it('should throw an error', () => {
				return expect(validateAddress.bind(null, address)).to.throw(
					"Address string format does not match it's number representation.",
				);
			});
		});
	});

	describe('#validateNonTransferAmount', () => {
		it('should return true when amount is 0', () => {
			return expect(validateNonTransferAmount('0')).to.be.true;
		});

		it('should return false when amount is greater than 0', () => {
			return expect(validateNonTransferAmount('1')).to.be.false;
		});

		it('should return false when amount is less than 0', () => {
			return expect(validateNonTransferAmount('-1')).to.be.false;
		});
	});

	describe('#validateTransferAmount', () => {
		it('should return false is amount is 0', () => {
			return expect(validateTransferAmount('0')).to.be.false;
		});

		it('should return true when amount is a number greater than 0 and less than maximum transaction amount', () => {
			return expect(validateTransferAmount('100')).to.be.true;
		});
	});

	describe('#validateFee', () => {
		it('should return true if amount is 0', () => {
			return expect(validateFee('0')).to.be.true;
		});

		it('should return true when amount is a number greater than 0 and less than maximum transaction amount', () => {
			return expect(validateFee('100')).to.be.true;
		});
	});

	describe('#isGreaterThanZero', () => {
		it('should return false when amount is 0', () => {
			return expect(isGreaterThanZero(new BigNum('0'))).to.be.false;
		});

		it('should return true when amount is greater than 0', () => {
			return expect(
				isGreaterThanZero(new BigNum('9223372036854775808987234289782357')),
			).to.be.true;
		});
	});

	describe('#isGreaterThanMaxTransactionAmount', () => {
		it('should return false when amount is less than maximum transaction amount', () => {
			return expect(
				isGreaterThanMaxTransactionAmount(new BigNum('9223372036854775807')),
			).to.be.false;
		});

		it('should return true when amount is more than maximum transaction amount', () => {
			return expect(
				isGreaterThanMaxTransactionAmount(new BigNum('9223372036854775808')),
			).to.be.true;
		});
	});

	describe('#isGreaterThanMaxTransactionId', () => {
		it('should return false when id is less than 8 bytes integer maximum', () => {
			return expect(
				isGreaterThanMaxTransactionId(new BigNum('18446744073709551615')),
			).to.be.false;
		});

		it('should return true when id is more than 8 bytes integer maximum', () => {
			return expect(
				isGreaterThanMaxTransactionId(new BigNum('18446744073709551616')),
			).to.be.true;
		});
	});

	describe('#isNumberString', () => {
		it('should return false when number is not string', () => {
			const invalidFunction = isNumberString as (input: any) => boolean;
			return expect(invalidFunction(1)).to.be.false;
		});

		it('should return false when string contains non number', () => {
			return expect(isNumberString('12345abc68789')).to.be.false;
		});

		it('should return true when string contains only number', () => {
			return expect(isNumberString('1234568789')).to.be.true;
		});
	});

	describe('#isValidInteger', () => {
		it('should return false when string was provided', () => {
			return expect(isValidInteger('1234')).to.be.false;
		});

		it('should return false when float was provided', () => {
			return expect(isValidInteger(123.4)).to.be.false;
		});

		it('should return true when integer was provided', () => {
			return expect(isValidInteger(6)).to.be.true;
		});

		it('should return true when negative integer was provided', () => {
			return expect(isValidInteger(-6)).to.be.true;
		});
	});

	describe('#isNullByteIncluded', () => {
		const validStrings = [
			'lorem ipsum',
			'lorem\u0001 ipsum',
			'loremU00000001 ipsum',
			'\u0001',
			'\x01',
			'l©rem',
			'❤',
		];

		const invalidStrings = [
			'\0',
			'\0lorem',
			'ipsum\0',
			'lorem\0 ipsum',
			'\x00',
			'\x00lorem',
			'ipsum\x00',
			'lorem\x00 ipsum',
			'\u0000',
			'\u0000lorem',
			'ipsum\u0000',
			'lorem\u0000 ipsum',
			'\\U00000000',
			'\\U00000000lorem',
			'ipsum\\U00000000',
			'lorem\\U00000000 ipsum',
		];

		it('should return false when valid string was provided', () => {
			validStrings.forEach(input => {
				expect(isNullByteIncluded(input)).to.be.false;
			});
		});

		it('should return true using unicode null characters', () => {
			invalidStrings.forEach(input => {
				expect(isNullByteIncluded(input)).to.be.true;
			});
		});
	});
});
