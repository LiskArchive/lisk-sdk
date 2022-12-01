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
	isNumberString,
	isValidInteger,
	isIPV6,
	isIPV4,
	isIP,
	isPort,
	isStringEndsWith,
	isProtocolString,
	isRangedSemVer,
	isEncryptedPassphrase,
	isHexString,
	isCsv,
	isString,
	isBoolean,
	isSInt32,
	isBytes,
	isUInt32,
	isSInt64,
	isUInt64,
} from '../src/validation';

describe('validation', () => {
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

	describe('#isHexString', () => {
		it('should return true when valid hex was provided', () => {
			return expect(
				isHexString('215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bc'),
			).toBeTrue();
		});

		it('should return false when number was provided', () => {
			return expect(isHexString(123.4)).toBeFalse();
		});

		it('should return false when non hex string was provided', () => {
			return expect(
				isHexString('zzzzzzza32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bc'),
			).toBeFalse();
		});
	});

	describe('#isEncryptedPassphrase', () => {
		it('should return true when value is valid encrypted passphrase', () => {
			return expect(
				isEncryptedPassphrase(
					'kdf=argon2id&cipher=aes-256-gcm&version=1&ciphertext=bd65587de1b7b42e289693e8ac14561c7c77370ff158133c6eb512849353446b339f04c8f45b6b8cc72e5e8485dab4031d9f5e2d7cb9d424076401ea58dad6d4a348fc1f013ceb5d8bb314&mac=6e017e6b2a341db10b91440462fc2626fe6e4b711ea09f8df3ac1df42a6de572&salt=e9f564ce7f8392acb2691fb4953e17c0&iv=57124bb910dbf9e24e37d401&tag=b769dcbd4ad0d3f44041afe5322aad82&iterations=1&parallelism=4&memorySize=2024',
				),
			).toBeTrue();
		});

		it('should return false when value includes invalid query', () => {
			return expect(
				isEncryptedPassphrase('cipherText=abcd1234&&iterations=10000&iv=ef012345'),
			).toBeFalse();
		});

		it('should return false when value is empty', () => {
			return expect(isEncryptedPassphrase('')).toBeFalse();
		});

		it('should return true when 24 words bip39 Mnemonic was encrypted', () => {
			return expect(
				isEncryptedPassphrase(
					'kdf=argon2id&cipher=aes-256-gcm&version=1&ciphertext=bd65587de1b7b42e289693e8ac14561c7c77370ff158133c6eb512849353446b339f04c8f45b6b8cc72e5e8485dab4031d9f5e2d7cb9d424076401ea58dad6d4a348fc1f013ceb5d8bb314&mac=6e017e6b2a341db10b91440462fc2626fe6e4b711ea09f8df3ac1df42a6de572&salt=e9f564ce7f8392acb2691fb4953e17c0&iv=57124bb910dbf9e24e37d401&tag=b769dcbd4ad0d3f44041afe5322aad82&iterations=1&parallelism=4&memorySize=2024',
				),
			).toBeTrue();
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
			return expect(isIPV4('FE80:0000:0000:0000:0202:B3FF:FE1E:8329')).toBeFalse();
		});
	});

	describe('#isIPV6', () => {
		it('should return true when the value is IPV6', () => {
			return expect(isIPV6('FE80:0000:0000:0000:0202:B3FF:FE1E:8329')).toBeTrue();
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
			return expect(isSInt64(BigInt('-92233720368547758102'))).toBeFalse();
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
