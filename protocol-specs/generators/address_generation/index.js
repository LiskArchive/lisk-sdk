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
 */
/* eslint-disable no-bitwise */

'use strict';

const { utils } = require('@liskhq/lisk-cryptography');
const BaseGenerator = require('../base_generator');

const publicKeys = [
	'0000000000000000000000000000000000000000000000000000000000000000',
	'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
	'00ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
	'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00',
	'749b88baa787e83b5a06bbfee95002ac5a9925dcaeea28262e683498147b8fce',
	'e877c250d725ac7ca6c5d9d83b39645de7eebe6c4ae6e076da7163434d297c7d',
	'54e336e62950e33f5dad88917dc2b4d7f41acc2e65536b8e73027d37fbdc78d2',
	'225b8a862942c7c65010fc031f2de01802b93bb094fd2d2cc546166b0dafcedf',
];

const PREFIX_LISK = 'lsk';
const CHARSET = 'zxvcpmbn3465o978uyrtkqew2adsjhfg';
const GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

const getBinaryAddress = publicKey => {
	const publicKeyBuffer = Buffer.from(publicKey, 'hex');
	return utils.hash(publicKeyBuffer).subarray(0, 20);
};

const polymod = uint5Array => {
	let chk = 1;
	for (const value of uint5Array) {
		const top = chk >> 25;
		chk = ((chk & 0x1ffffff) << 5) ^ value;
		for (let i = 0; i < 5; i += 1) {
			if ((top >> i) & 1) {
				chk ^= GENERATOR[i];
			}
		}
	}
	return chk;
};

const createChecksum = uint5Array => {
	const values = uint5Array.concat([0, 0, 0, 0, 0, 0]);
	const mod = polymod(values) ^ 1;
	const result = [];
	for (let p = 0; p < 6; p += 1) {
		result.push((mod >> (5 * (5 - p))) & 31);
	}
	return result;
};

const convertUIntArray = (uintArray, fromBits, toBits) => {
	const maxValue = (1 << toBits) - 1;
	let accumulator = 0;
	let bits = 0;
	const result = [];
	for (const byte of uintArray) {
		accumulator = (accumulator << fromBits) | byte;
		bits += fromBits;
		while (bits >= toBits) {
			bits -= toBits;
			result.push((accumulator >> bits) & maxValue);
		}
	}
	return result;
};

const convertUInt5ToBase32 = uint5Array => uint5Array.map(val => CHARSET[val]).join('');

const getBase32Address = publicKey => {
	const binaryAddress = getBinaryAddress(publicKey);
	const uint5Address = convertUIntArray(Uint8Array.from(binaryAddress), 8, 5);
	const uint5Checksum = createChecksum(uint5Address);
	return `${PREFIX_LISK}${convertUInt5ToBase32(uint5Address.concat(uint5Checksum))}`;
};

const generateTestCasesForAddressFromPubKey = publicKey => ({
	description: 'Generate valid address from a valid public key',
	input: { publicKey },
	output: {
		binaryAddress: getBinaryAddress(publicKey),
		base32Address: getBase32Address(publicKey),
	},
});

const addressFromPubKeySuite = () => ({
	title: 'Binary and Base32 address generation',
	summary: 'Binary and Base32 address generation from a public key',
	config: { network: 'mainnet' },
	runner: 'address_generation',
	handler: 'address_from_pub_key',
	testCases: publicKeys.map(generateTestCasesForAddressFromPubKey),
});

BaseGenerator.runGenerator('address_generation', [addressFromPubKeySuite]);
