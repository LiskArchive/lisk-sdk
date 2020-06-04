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
import {
	validatePublicKeysForDuplicates,
	validatePublicKey,
	validatePublicKeys,
	validateAddress,
	isValidNonTransferAmount,
	isGreaterThanMaxTransactionId,
	isNumberString,
	isValidInteger,
	isNullCharacterIncluded,
	isIPV6,
	isIPV4,
	isIP,
	isPort,
	isStringEndsWith,
	isProtocolString,
	isRangedSemVer,
	isEncryptedPassphrase,
	isHexString,
	isStringBufferLessThan,
	hasNoDuplicate,
	isCsv,
	isSignature,
	isValidTransferData,
	isString,
	isBoolean,
	isSInt32,
	isBytes,
	isUInt32,
	isSInt64,
	isUInt64,
} from '../src/validation';

describe('validation', () => {
	describe('#validatePublicKey', () => {
		describe('Given a hex string with odd length', () => {
			const invalidHexPublicKey =
				'215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bc';
			it('should throw an error', () => {
				return expect(
					validatePublicKey.bind(null, invalidHexPublicKey),
				).toThrow('Argument must have a valid length of hex string.');
			});
		});

		describe('Given a hex string with additional non-hex characters', () => {
			const invalidHexPublicKey =
				'12345678123456781234567812345678123456781234567812345678123456gg';
			it('should throw an error', () => {
				return expect(
					validatePublicKey.bind(null, invalidHexPublicKey),
				).toThrow('Argument must be a valid hex string.');
			});
		});

		describe('Given a too long public key', () => {
			const tooLongPublicKey =
				'215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca12';
			it('should throw an error', () => {
				return expect(validatePublicKey.bind(null, tooLongPublicKey)).toThrow(
					'Public key 215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca12 length differs from the expected 32 bytes for a public key.',
				);
			});
		});

		describe('Given a too short public key', () => {
			const tooShortPublicKey =
				'215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452b';
			it('should throw an error', () => {
				return expect(validatePublicKey.bind(null, tooShortPublicKey)).toThrow(
					'Public key 215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452b length differs from the expected 32 bytes for a public key.',
				);
			});
		});

		describe('Given a valid public key', () => {
			const publicKey =
				'215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca';
			it('should return true', () => {
				return expect(validatePublicKey(publicKey)).toBeTrue();
			});
		});

		describe('Given a valid public key with only numeric characters', () => {
			const publicKey =
				'1234567812345678123456781234567812345678123456781234567812345678';
			it('should return true', () => {
				return expect(validatePublicKey(publicKey)).toBeTrue();
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
				return expect(validatePublicKeys.bind(null, publicKeys)).toThrow(
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
				return expect(validatePublicKeys(publicKeys)).toBeTrue();
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
				return expect(validatePublicKeysForDuplicates(publicKeys)).toBeTrue();
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
					validatePublicKeysForDuplicates.bind(null, publicKeys),
				).toThrow(
					'Duplicated public key: 922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa.',
				);
			});
		});
	});

	describe('#validateAddress', () => {
		describe('Given valid addresses', () => {
			const addresses = [
				'66687aadf862bd776c8fc18b8e9f8e2008971485',
				'af9613760f72635fbdb44a5a0a63c39f12af30f9',
				'c946da78163c094fd8310efc9a81be13cac6a518',
				'053d7733df22210dd0e6b4ec595a29cdb33ffb07',
			];

			it('should return true', () => {
				return addresses.forEach(address => {
					return expect(validateAddress(address)).toBeTrue();
				});
			});
		});

		describe('Given an address that is too short', () => {
			const address = '1';
			it('should throw an error', () => {
				return expect(validateAddress.bind(null, address)).toThrow(
					'Address length does not match requirements. Expected 40 characters.',
				);
			});
		});

		describe('Given an address that is too long', () => {
			const address = '66687aadf862bd776c8fc18b8e9f8e20089714851';
			it('should throw an error', () => {
				return expect(validateAddress.bind(null, address)).toThrow(
					'Address length does not match requirements. Expected 40 characters.',
				);
			});
		});

		describe('Given an address that includes `.`', () => {
			const address = '46.87aadf862bd776c8fc18b8e9f8e2008971486';
			it('should throw an error', () => {
				return expect(validateAddress.bind(null, address)).toThrow(
					'Address is not a valid hex string.',
				);
			});
		});
	});

	describe('#isValidNonTransferAmount', () => {
		it('should return true when amount is 0', () => {
			return expect(isValidNonTransferAmount('0')).toBeTrue();
		});

		it('should return false when amount is greater than 0', () => {
			return expect(isValidNonTransferAmount('1')).toBeFalse();
		});

		it('should return false when amount is less than 0', () => {
			return expect(isValidNonTransferAmount('-1')).toBeFalse();
		});
	});

	describe('#isGreaterThanMaxTransactionId', () => {
		it('should return false when id is negative', () => {
			return expect(isGreaterThanMaxTransactionId(BigInt('-1'))).toBeFalse();
		});

		it('should return false when id is less than 8 bytes integer maximum', () => {
			return expect(
				isGreaterThanMaxTransactionId(BigInt('18446744073709551615')),
			).toBeFalse();
		});

		it('should return true when id is more than 8 bytes integer maximum', () => {
			return expect(
				isGreaterThanMaxTransactionId(BigInt('18446744073709551616')),
			).toBeTrue();
		});
	});

	describe('#isNumberString', () => {
		it('should return false when number is not string', () => {
			const invalidFunction = isNumberString as (input: any) => boolean;
			return expect(invalidFunction(1)).toBeFalse();
		});

		it('should return false when string contains non number', () => {
			return expect(isNumberString('12345abc68789')).toBeFalse();
		});

		it('should return false for empty string value', () => {
			return expect(isNumberString('')).toBeFalse();
		});

		it('should return false for null value', () => {
			return expect(isNumberString(null)).toBeFalse();
		});

		it('should return true when string contains only number', () => {
			return expect(isNumberString('1234568789')).toBeTrue();
		});
	});

	describe('#isValidInteger', () => {
		it('should return false when string was provided', () => {
			return expect(isValidInteger('1234')).toBeFalse();
		});

		it('should return false when float was provided', () => {
			return expect(isValidInteger(123.4)).toBeFalse();
		});

		it('should return true when integer was provided', () => {
			return expect(isValidInteger(6)).toBeTrue();
		});

		it('should return true when negative integer was provided', () => {
			return expect(isValidInteger(-6)).toBeTrue();
		});
	});

	describe('#hasNoDuplicate', () => {
		it('should return true when string array is unique', () => {
			return expect(hasNoDuplicate(['1234', '4567'])).toBeTrue();
		});

		it('should return false when array contains duplicate', () => {
			return expect(hasNoDuplicate(['1234', 'a', '1234'])).toBeFalse();
		});
	});

	describe('#isStringBufferLessThan', () => {
		it('should return true when 32 character is provided with max 64', () => {
			return expect(
				isStringBufferLessThan('abcdefghijklmnopqrstuwxyzabcdefg', 32),
			).toBeTrue();
		});

		it('should return false when 33 character is provided with max 64', () => {
			return expect(
				isStringBufferLessThan('abcdefghijklmnopqrstuwxyzabcdefgh', 32),
			).toBeFalse();
		});

		it('should return false when number was provided', () => {
			return expect(isStringBufferLessThan(123, 3)).toBeFalse();
		});
	});

	describe('#isHexString', () => {
		it('should return true when valid hex was provided', () => {
			return expect(
				isHexString(
					'215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bc',
				),
			).toBeTrue();
		});

		it('should return false when number was provided', () => {
			return expect(isHexString(123.4)).toBeFalse();
		});

		it('should return false when non hex string was provided', () => {
			return expect(
				isHexString(
					'zzzzzzza32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bc',
				),
			).toBeFalse();
		});
	});

	describe('#isEncryptedPassphrase', () => {
		it('should return true when value is valid encrypted passphrase', () => {
			return expect(
				isEncryptedPassphrase(
					'iterations=1&salt=d3e4c10d1f889d45fc1f23dd1a55a4ed&cipherText=c030aae98cb41b3cadf6cf8b71d8dc1304c709696880e09c6c5f41361666ced2ce804407ac99c05799f06ea513be9cb80bbb824db6e0e69fa252f3ce2fe654d34d4f7344fcaeafe143d3b1&iv=03414e5d5e79f22c04f20a57&tag=5025de28a5134e2cf6c4cc3a3212723b&version=1',
				),
			).toBeTrue();
		});

		it('should return false when value includes invalud query', () => {
			return expect(
				isEncryptedPassphrase(
					'cipherText=abcd1234&&iterations=10000&iv=ef012345',
				),
			).toBeFalse();
		});

		it('should return false when value is empty', () => {
			return expect(isEncryptedPassphrase('')).toBeFalse();
		});
	});

	describe('#isRangedSemVer', () => {
		it('should return true when it is valid ranged semver', () => {
			return expect(isRangedSemVer('>=10.0')).toBeTrue();
		});

		it('should return false when value is not valid ranged semver', () => {
			return expect(isRangedSemVer('>>10.0')).toBeFalse();
		});
	});

	describe('#isProtocolString', () => {
		it('should return true when it is protocol version', () => {
			return expect(isProtocolString('10.0')).toBeTrue();
		});

		it('should return false when value is semver', () => {
			return expect(isProtocolString('1.0.2')).toBeFalse();
		});
	});

	describe('#isIPV4', () => {
		it('should return true when the value is IPV4', () => {
			return expect(isIPV4('127.0.0.0')).toBeTrue();
		});

		it('should return false when the value is not IPV4', () => {
			return expect(
				isIPV4('FE80:0000:0000:0000:0202:B3FF:FE1E:8329'),
			).toBeFalse();
		});
	});

	describe('#isIPV6', () => {
		it('should return true when the value is IPV6', () => {
			return expect(
				isIPV6('FE80:0000:0000:0000:0202:B3FF:FE1E:8329'),
			).toBeTrue();
		});

		it('should return false when the value is not IPV6', () => {
			return expect(isIPV6('127.0.0.0')).toBeFalse();
		});
	});

	describe('#isIP', () => {
		it('should return true when the value is IPV6', () => {
			return expect(isIP('FE80:0000:0000:0000:0202:B3FF:FE1E:8329')).toBeTrue();
		});

		it('should return true when the value is IPV4', () => {
			return expect(isIP('127.0.0.0')).toBeTrue();
		});

		it('should return false when the value is not ip', () => {
			return expect(isIP('0.0.0.0.0.0')).toBeFalse();
		});
	});

	describe('#isPort', () => {
		it('should return true when the value is port', () => {
			return expect(isPort('3000')).toBeTrue();
		});

		it('should return true when the value is invalid port number', () => {
			return expect(isPort('999999')).toBeFalse();
		});

		it('should return false when the value is not number', () => {
			return expect(isPort('abc')).toBeFalse();
		});
	});

	describe('#isStringEndsWith', () => {
		it('should return true when the value ends with suffix', () => {
			return expect(isStringEndsWith('sample', ['le', 'e'])).toBeTrue();
		});

		it('should return false when the suffix does not match', () => {
			return expect(isStringEndsWith('samp', ['le', 'e'])).toBeFalse();
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
			'\\U00000000',
			'\\U00000000lorem',
			'ipsum\\U00000000',
			'lorem\\U00000000 ipsum',
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
		];

		it('should return false when valid string was provided', () => {
			validStrings.forEach(input => {
				expect(isNullCharacterIncluded(input)).toBeFalse();
			});
		});

		it('should return true using unicode null characters', () => {
			invalidStrings.forEach(input => {
				expect(isNullCharacterIncluded(input)).toBeTrue();
			});
		});
	});

	describe('#isCsv', () => {
		it('should return true when the value is a CSV string', () => {
			const csvString = '64,9,77,23,12,26,29,28,2008';
			return expect(isCsv(csvString)).toBeTrue();
		});

		it('should return false when the value is not a CSV string', () => {
			const csvString = 0 as any;
			return expect(isCsv(csvString)).toBeFalse();
		});

		it('should return true when the value is empty string', () => {
			const csvString = '';
			return expect(isCsv(csvString)).toBeTrue();
		});

		it('should return false when the value is undefined', () => {
			const csvString = undefined as any;
			return expect(isCsv(csvString)).toBeFalse();
		});

		it('should return false when the value is an array of string', () => {
			const csvString = ['64', '12'] as any;
			return expect(isCsv(csvString)).toBeFalse();
		});
	});

	describe('#isSignature', () => {
		it('should return false if value is not in hex format', () => {
			const invalidSignature =
				'zxcdec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8';
			return expect(isSignature(invalidSignature)).toBeFalse();
		});

		it('should return false for empty string values', () => {
			const invalidSignature = '';
			return expect(isSignature(invalidSignature)).toBeFalse();
		});

		it('should return false if value < 128', () => {
			const invalidLengthSignature =
				'3d0ea2004c3dea8076a6a22c6db8bae95bc0db819240c77fc5335f32920e91b9f41f58b01fc86dfda11019c9fd1c6c3dcbab0a4e478e3c9186ff6090dc05';
			return expect(isSignature(invalidLengthSignature)).toBeFalse();
		});

		it('should return false if value > 128', () => {
			const invalidLengthSignature =
				'1231d8103d0ea2004c3dea8076a6a22c6db8bae95bc0db819240c77fc5335f32920e91b9f41f58b01fc86dfda11019c9fd1c6c3dcbab0a4e478e3c9186ff6090dc05';
			return expect(isSignature(invalidLengthSignature)).toBeFalse();
		});

		it('should return true for valid signature', () => {
			const validSignature =
				'd8103d0ea2004c3dea8076a6a22c6db8bae95bc0db819240c77fc5335f32920e91b9f41f58b01fc86dfda11019c9fd1c6c3dcbab0a4e478e3c9186ff6090dc05';
			return expect(isSignature(validSignature)).toBeTrue();
		});
	});

	describe('#isValidTransferData', () => {
		it('should return false if string is longer than maxLength in characters', () => {
			// Generate string of length 65
			const invalidDataMaxLength = `1${Array(64 + 1).join('1')}`;

			return expect(isValidTransferData(invalidDataMaxLength)).toBeFalse();
		});

		it('should return false if string is longer than maxLength in bytes', () => {
			// Generate string of length 64 but byte size 65
			const invalidDataWith2ByteUnicode = `1${Array(64 - 1).join('1')}现`;

			expect(isValidTransferData(invalidDataWith2ByteUnicode)).toBeFalse();
		});

		it('should return true if string is between minLength and maxLength', () => {
			const validDataMinimum = `1`;
			const validDataMaximum = `1${Array(64).join('1')}`;

			expect(isValidTransferData(validDataMinimum)).toBeTrue();
			expect(isValidTransferData(validDataMaximum)).toBeTrue();
		});
	});

	describe('#isBytes', () => {
		it('should return false when number was provided', () => {
			return expect(isBytes(1234)).toBeFalse();
		});

		it('should return false when boolean was provided', () => {
			return expect(isBytes(false)).toBeFalse();
		});

		it('should return false when bigint was provided', () => {
			return expect(isBytes(BigInt(9))).toBeFalse();
		});

		it('should return false when string was provided', () => {
			return expect(isBytes('lisk test 12345')).toBeFalse();
		});

		it('should return true when buffer was provided', () => {
			return expect(isBytes(Buffer.from('lisk', 'utf8'))).toBeTrue();
		});
	});

	describe('#isString', () => {
		it('should return false when number was provided', () => {
			return expect(isString(1234)).toBeFalse();
		});

		it('should return false when boolean was provided', () => {
			return expect(isString(false)).toBeFalse();
		});

		it('should return false when bigint was provided', () => {
			return expect(isString(BigInt(9))).toBeFalse();
		});

		it('should return false when buffer was provided', () => {
			return expect(isString(Buffer.from('lisk', 'utf8'))).toBeFalse();
		});

		it('should return true when string was provided', () => {
			return expect(isString('lisk test 12345')).toBeTrue();
		});
	});

	describe('#isBoolean', () => {
		it('should return false when number was provided', () => {
			return expect(isBoolean(1234)).toBeFalse();
		});

		it('should return false when bigint was provided', () => {
			return expect(isBoolean(BigInt(9))).toBeFalse();
		});

		it('should return false when buffer was provided', () => {
			return expect(isBoolean(Buffer.from('lisk', 'utf8'))).toBeFalse();
		});

		it('should return false when string was provided', () => {
			return expect(isBoolean('lisk test 12345')).toBeFalse();
		});

		it('should return true when boolean was provided', () => {
			expect(isBoolean(false)).toBeTrue();

			return expect(isBoolean(true)).toBeTrue();
		});
	});

	describe('#isSInt32', () => {
		it('should return false when string was provided', () => {
			return expect(isSInt32('1234')).toBeFalse();
		});

		it('should return false when bigint was provided', () => {
			return expect(isSInt32(BigInt(9))).toBeFalse();
		});

		it('should return false when buffer was provided', () => {
			return expect(isSInt32(Buffer.from('lisk', 'utf8'))).toBeFalse();
		});

		it('should return false when a boolean was provided', () => {
			return expect(isSInt32(true)).toBeFalse();
		});

		it('should return false when the number is just over the limit of sint32', () => {
			return expect(isSInt32(2147483648)).toBeFalse();
		});

		it('should return false when a number "-2147483648" which is just below the limit of sint32', () => {
			return expect(isSInt32(-2147483648)).toBeFalse();
		});

		it('should return true when a valid number was provided', () => {
			return expect(isSInt32(2147483647)).toBeTrue();
		});

		it('should return true when a valid negative number is provided "-2147483644"', () => {
			return expect(isSInt32(-2147483644)).toBeTrue();
		});
	});

	describe('#isUInt32', () => {
		it('should return false when string was provided', () => {
			return expect(isUInt32('1234')).toBeFalse();
		});

		it('should return false when bigint was provided', () => {
			return expect(isUInt32(BigInt(9))).toBeFalse();
		});

		it('should return false when buffer was provided', () => {
			return expect(isUInt32(Buffer.from('lisk', 'utf8'))).toBeFalse();
		});

		it('should return false when a boolean was provided', () => {
			return expect(isUInt32(true)).toBeFalse();
		});

		it('should return false when a negative number was provided', () => {
			return expect(isUInt32(-12)).toBeFalse();
		});

		it('should return false when the number is just over the limit of isUInt32 "4294967295"', () => {
			return expect(isUInt32(4294967296)).toBeFalse();
		});

		it('should return true when a valid number was provided', () => {
			return expect(isUInt32(4294967294)).toBeTrue();
		});
	});

	describe('#isSInt64', () => {
		it('should return false when string was provided', () => {
			return expect(isSInt64('1234')).toBeFalse();
		});

		it('should return false when buffer was provided', () => {
			return expect(isSInt64(Buffer.from('lisk', 'utf8'))).toBeFalse();
		});

		it('should return false when a boolean was provided', () => {
			return expect(isSInt64(true)).toBeFalse();
		});

		it('should return false when a bigint was provided over the limit "BigInt(9223372036854775807)"', () => {
			return expect(isSInt64(BigInt(9223372036854775810))).toBeFalse();
		});

		it('should return false when a bigint was provided below the limit "BigInt(-92233720368547758102)"', () => {
			return expect(isSInt64(BigInt(-92233720368547758102))).toBeFalse();
		});

		it('should return true when a valid bigint was provided', () => {
			return expect(isSInt64(BigInt(98986))).toBeTrue();
		});

		it('should return true when a valid negative bigint was provided', () => {
			return expect(isSInt64(BigInt(-100))).toBeTrue();
		});
	});

	describe('#isUInt64', () => {
		it('should return false when string was provided', () => {
			return expect(isUInt64('1234')).toBeFalse();
		});

		it('should return false when buffer was provided', () => {
			return expect(isUInt64(Buffer.from('lisk', 'utf8'))).toBeFalse();
		});

		it('should return false when a number was provided', () => {
			return expect(isUInt64(4294967294)).toBeFalse();
		});

		it('should return false when a boolean was provided', () => {
			return expect(isUInt64(true)).toBeFalse();
		});

		it('should return false when a negative number was provided', () => {
			return expect(isUInt64(-12)).toBeFalse();
		});

		it('should return false when a bigint was provided over the limit "BigInt(18446744073709551620)"', () => {
			return expect(isSInt64(BigInt(18446744073709551620))).toBeFalse();
		});

		it('should return true when a valid bigint was provided', () => {
			return expect(isUInt64(BigInt(98986))).toBeTrue();
		});
	});
});
