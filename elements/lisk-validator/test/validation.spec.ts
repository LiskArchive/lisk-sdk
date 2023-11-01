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
			expect(
				isHexString('215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452b'),
			).toBeTrue();
			expect(
				isHexString('215B667A32a5cd51A94c9c2046c11fffb08c65748febec099451e3b164452B'),
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

		it('should return true when input is empty', () => {
			return expect(isHexString('')).toBeTrue();
		});

		it('should return false when input length is odd', () => {
			return expect(isHexString('ff1')).toBeFalse();
		});
	});

	describe('#isEncryptedPassphrase', () => {
		it('should return true when value is valid encrypted passphrase', () => {
			return expect(
				isEncryptedPassphrase(
					'kdf=argon2id&cipher=aes-128-gcm&version=1&ciphertext=31b2cec3ca4585d4503b46444f5836b948d875367a5f5fc08bc4ca424db60acb4a86ab98f8dd4dd73f5589ede1b8c5abc16eb73561b48aab422dd6e716b97c91721a781e3e8acfdb39c0a7f41fd23ba8&mac=bfdf26800dab13a8e88ee7fa90fcd6d43459e762fe811b3be3664537df36c026&salt=e3db480467e4e61e&iv=11af231d8cbbe77d09e515f1b3308c57&tag=81b20ab2154678a020412a8459d79554&iterations=1&parallelism=4&memorySize=2024',
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
					'kdf=argon2id&cipher=aes-128-gcm&version=1&ciphertext=31b2cec3ca4585d4503b46444f5836b948d875367a5f5fc08bc4ca424db60acb4a86ab98f8dd4dd73f5589ede1b8c5abc16eb73561b48aab422dd6e716b97c91721a781e3e8acfdb39c0a7f41fd23ba8&mac=bfdf26800dab13a8e88ee7fa90fcd6d43459e762fe811b3be3664537df36c026&salt=e3db480467e4e61e&iv=11af231d8cbbe77d09e515f1b3308c57&tag=81b20ab2154678a020412a8459d79554&iterations=1&parallelism=4&memorySize=2024',
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

		it('should return false when a number "-2147483649" which is just below the limit of sint32', () => {
			return expect(isSInt32(-2147483649)).toBeFalse();
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
