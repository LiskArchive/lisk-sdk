/*
 * Copyright © 2022 Lisk Foundation
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

import { BLS_SIGNATURE_LENGTH, cryptography } from 'lisk-sdk';
import * as utils from '../../src/active_validators_update';
import {
	calculateActiveValidatorsUpdate,
	getActiveValidatorsUpdate,
} from '../../src/active_validators_update';
import { ADDRESS_LENGTH, BLS_PUBLIC_KEY_LENGTH, HASH_LENGTH } from '../../src/constants';

describe('calculateActiveValidatorsUpdate', () => {
	const certificateValidatorsHash = cryptography.utils.hash(cryptography.utils.getRandomBytes(32));
	const lastCertificateValidatorsHash = cryptography.utils.hash(
		cryptography.utils.getRandomBytes(32),
	);
	const certificate = {
		aggregationBits: Buffer.alloc(1),
		blockID: cryptography.utils.hash(cryptography.utils.getRandomBytes(8)),
		height: 10,
		signature: cryptography.utils.getRandomBytes(BLS_SIGNATURE_LENGTH),
		stateRoot: cryptography.utils.getRandomBytes(HASH_LENGTH),
		timestamp: Date.now(),
		validatorsHash: certificateValidatorsHash,
	};
	const lastCertificate = {
		height: certificate.height - 1,
		stateRoot: cryptography.utils.getRandomBytes(HASH_LENGTH),
		timestamp: certificate.timestamp - 1,
		validatorsHash: lastCertificateValidatorsHash,
	};
	const validatorData = {
		certificateThreshold: BigInt(68),
		validators: [
			{
				address: cryptography.utils.getRandomBytes(ADDRESS_LENGTH),
				bftWeight: BigInt(1),
				blsKey: cryptography.utils.getRandomBytes(BLS_PUBLIC_KEY_LENGTH),
			},
			{
				address: cryptography.utils.getRandomBytes(ADDRESS_LENGTH),
				bftWeight: BigInt(1),
				blsKey: cryptography.utils.getRandomBytes(BLS_PUBLIC_KEY_LENGTH),
			},
		],
		validatorsHash: certificate.validatorsHash,
	};

	it('should throw error is no validator data found for certificate', () => {
		expect(() =>
			calculateActiveValidatorsUpdate(
				certificate,
				[{ ...validatorData, validatorsHash: Buffer.alloc(0) }],
				lastCertificate,
			),
		).toThrow('No validators data found for the certificate height.');
	});

	it('should throw error if no validators data found for last certificate', () => {
		expect(() =>
			calculateActiveValidatorsUpdate(
				certificate,
				[validatorData, { ...validatorData, validatorsHash: Buffer.alloc(0) }],
				lastCertificate,
			),
		).toThrow('No validators data found for the given last certificate height.');
	});

	it('should return activeValidatorsUpdate and last certificate threshold if certificate threshhold is not changed', () => {
		const activeValidatorsUpdate = {
			blsKeysUpdate: [validatorData.validators[0].blsKey, validatorData.validators[1].blsKey],
			bftWeightsUpdate: [BigInt(1), BigInt(1)],
			bftWeightsUpdateBitmap: Buffer.alloc(0),
		};
		jest.spyOn(utils, 'getActiveValidatorsUpdate').mockReturnValue(activeValidatorsUpdate);
		expect(
			calculateActiveValidatorsUpdate(
				certificate,
				[validatorData, { ...validatorData, validatorsHash: lastCertificate.validatorsHash }],
				lastCertificate,
			),
		).toEqual({ activeValidatorsUpdate, certificateThreshold: validatorData.certificateThreshold });
	});

	it('should return activeValidatorsUpdate and new certificate threshold if certificate threshold has changed', () => {
		const newCertificateThreshold = BigInt(67);
		const activeValidatorsUpdate = {
			blsKeysUpdate: [validatorData.validators[0].blsKey, validatorData.validators[1].blsKey],
			bftWeightsUpdate: [BigInt(1), BigInt(1)],
			bftWeightsUpdateBitmap: Buffer.alloc(0),
		};
		jest.spyOn(utils, 'getActiveValidatorsUpdate').mockReturnValue(activeValidatorsUpdate);
		expect(
			calculateActiveValidatorsUpdate(
				certificate,
				[
					{ ...validatorData, certificateThreshold: newCertificateThreshold },
					{ ...validatorData, validatorsHash: lastCertificate.validatorsHash },
				],
				lastCertificate,
			),
		).toEqual({ activeValidatorsUpdate, certificateThreshold: newCertificateThreshold });
	});
});

describe('getActiveValidatorsUpdate', () => {
	const bytesToBuffer = (str: string): Buffer => {
		const val = BigInt(`0b${str}`).toString(16);
		return Buffer.from(`${val.length % 2 === 0 ? val : `0${val}`}`, 'hex');
	};

	const cases = [
		[
			// 2 new validators
			{
				currentValidators: [
					{
						blsKey: Buffer.from('02', 'hex'),
						bftWeight: BigInt(20),
					},
				],
				newValidators: [
					{
						blsKey: Buffer.from('02', 'hex'),
						bftWeight: BigInt(20),
					},
					{
						blsKey: Buffer.from('03', 'hex'),
						bftWeight: BigInt(30),
					},
					{
						blsKey: Buffer.from('04', 'hex'),
						bftWeight: BigInt(40),
					},
				],
				expected: {
					blsKeysUpdate: [Buffer.from('03', 'hex'), Buffer.from('04', 'hex')],
					bftWeightsUpdate: [BigInt(30), BigInt(40)],
					bftWeightsUpdateBitmap: bytesToBuffer('110'),
				},
			},
		],
		[
			// 2 new validators and update bft weight for existing ones
			{
				currentValidators: [
					{
						blsKey: Buffer.from('02', 'hex'),
						bftWeight: BigInt(20),
					},
				],
				newValidators: [
					{
						blsKey: Buffer.from('02', 'hex'),
						bftWeight: BigInt(99),
					},
					{
						blsKey: Buffer.from('03', 'hex'),
						bftWeight: BigInt(30),
					},
					{
						blsKey: Buffer.from('04', 'hex'),
						bftWeight: BigInt(40),
					},
				],
				expected: {
					blsKeysUpdate: [Buffer.from('03', 'hex'), Buffer.from('04', 'hex')],
					bftWeightsUpdate: [BigInt(99), BigInt(30), BigInt(40)],
					bftWeightsUpdateBitmap: bytesToBuffer('111'),
				},
			},
		],
		[
			// complete new set
			{
				currentValidators: [
					{
						blsKey: Buffer.from('02', 'hex'),
						bftWeight: BigInt(20),
					},
				],
				newValidators: [
					{
						blsKey: Buffer.from('05', 'hex'),
						bftWeight: BigInt(99),
					},
					{
						blsKey: Buffer.from('03', 'hex'),
						bftWeight: BigInt(30),
					},
					{
						blsKey: Buffer.from('04', 'hex'),
						bftWeight: BigInt(40),
					},
				],
				expected: {
					blsKeysUpdate: [
						Buffer.from('03', 'hex'),
						Buffer.from('04', 'hex'),
						Buffer.from('05', 'hex'),
					],
					bftWeightsUpdate: [BigInt(0), BigInt(30), BigInt(40), BigInt(99)],
					bftWeightsUpdateBitmap: bytesToBuffer('1111'),
				},
			},
		],
		[
			// complete new set
			{
				currentValidators: [
					{
						blsKey: Buffer.from('02', 'hex'),
						bftWeight: BigInt(20),
					},
				],
				newValidators: new Array(100).fill(0).map((_, i) => ({
					blsKey: Buffer.from([i + 3]),
					bftWeight: BigInt(i + 10),
				})),
				expected: {
					blsKeysUpdate: new Array(100).fill(0).map((_, i) => Buffer.from([i + 3])),
					bftWeightsUpdate: [BigInt(0), ...new Array(100).fill(0).map((_, i) => BigInt(i + 10))],
					bftWeightsUpdateBitmap: bytesToBuffer('0'.repeat(27) + '1'.repeat(101)),
				},
			},
		],
		[
			// only remove validator
			{
				currentValidators: [
					{
						blsKey: Buffer.from('05', 'hex'),
						bftWeight: BigInt(99),
					},
					{
						blsKey: Buffer.from('03', 'hex'),
						bftWeight: BigInt(30),
					},
					{
						blsKey: Buffer.from('04', 'hex'),
						bftWeight: BigInt(40),
					},
				],
				newValidators: [],
				expected: {
					blsKeysUpdate: [],
					bftWeightsUpdate: [BigInt(0), BigInt(0), BigInt(0)],
					bftWeightsUpdateBitmap: bytesToBuffer('111'),
				},
			},
		],
		[
			// remove and change weight
			{
				currentValidators: [
					{
						blsKey: Buffer.from('05', 'hex'),
						bftWeight: BigInt(99),
					},
					{
						blsKey: Buffer.from('03', 'hex'),
						bftWeight: BigInt(30),
					},
					{
						blsKey: Buffer.from('04', 'hex'),
						bftWeight: BigInt(40),
					},
				],
				newValidators: [
					{
						blsKey: Buffer.from('03', 'hex'),
						bftWeight: BigInt(90),
					},
				],
				expected: {
					blsKeysUpdate: [],
					bftWeightsUpdate: [BigInt(90), BigInt(0), BigInt(0)],
					bftWeightsUpdateBitmap: bytesToBuffer('111'),
				},
			},
		],
	];

	it.each(cases)('should compute expected activeValidatorsUpdate', val => {
		expect(getActiveValidatorsUpdate(val.currentValidators, val.newValidators)).toEqual(
			val.expected,
		);
	});
});
