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

import { utils } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import * as cryptography from '@liskhq/lisk-cryptography';
import { validator } from '@liskhq/lisk-validator';
import { BLS_SIGNATURE_LENGTH, VerifyStatus } from '../../../../src';
import {
	CCMStatusCode,
	CROSS_CHAIN_COMMAND_SIDECHAIN_TERMINATED,
	EMPTY_BYTES,
	HASH_LENGTH,
	LIVENESS_LIMIT,
	MAX_CCM_SIZE,
	MODULE_NAME_INTEROPERABILITY,
} from '../../../../src/modules/interoperability/constants';
import {
	ChainAccount,
	CrossChainUpdateTransactionParams,
	CCMsg,
} from '../../../../src/modules/interoperability/types';
import {
	checkCertificateTimestamp,
	checkLivenessRequirement,
	validateFormat,
	verifyLivenessConditionForRegisteredChains,
	isValidName,
} from '../../../../src/modules/interoperability/utils';
import * as interopUtils from '../../../../src/modules/interoperability/utils';
import { certificateSchema } from '../../../../src/engine/consensus/certificate_generation/schema';
import { Certificate } from '../../../../src/engine/consensus/certificate_generation/types';
import { ChainStatus } from '../../../../src/modules/interoperability/stores/chain_account';

jest.mock('@liskhq/lisk-cryptography', () => ({
	...jest.requireActual('@liskhq/lisk-cryptography'),
}));

describe('Utils', () => {
	const defaultCertificate: Certificate = {
		blockID: cryptography.utils.getRandomBytes(HASH_LENGTH),
		height: 23,
		stateRoot: Buffer.alloc(HASH_LENGTH),
		timestamp: Math.floor(Date.now() / 1000),
		validatorsHash: cryptography.utils.getRandomBytes(HASH_LENGTH),
		aggregationBits: cryptography.utils.getRandomBytes(1),
		signature: cryptography.utils.getRandomBytes(BLS_SIGNATURE_LENGTH),
	};

	beforeEach(() => {
		jest.spyOn(validator, 'validate');
	});

	describe('checkLivenessRequirement', () => {
		const partnerChainAccount = {
			status: ChainStatus.REGISTERED,
		};

		const txParamsEmptyCertificate = {
			certificate: EMPTY_BYTES,
			sendingChainID: utils.intToBuffer(4, 4),
		};

		const txParamsNonEmptyCertificate = {
			certificate: cryptography.utils.getRandomBytes(32),
		};

		it(`should return VerifyStatus.FAIL status when chain status ${ChainStatus.REGISTERED} && certificate is empty`, () => {
			const result = checkLivenessRequirement(
				partnerChainAccount as ChainAccount,
				txParamsEmptyCertificate as CrossChainUpdateTransactionParams,
			);
			expect(result.status).toEqual(VerifyStatus.FAIL);
		});

		it(`should return status VerifyStatus.OK status when chain status ${ChainStatus.REGISTERED} && certificate is non-empty`, () => {
			const result = checkLivenessRequirement(
				partnerChainAccount as ChainAccount,
				txParamsNonEmptyCertificate as CrossChainUpdateTransactionParams,
			);
			expect(result.status).toEqual(VerifyStatus.OK);
		});
	});

	describe('checkCertificateTimestamp', () => {
		const timestamp = Date.now();
		const txParams: any = {
			certificate: Buffer.alloc(2),
		};
		const txParamsWithEmptyCertificate: any = {
			certificate: Buffer.alloc(0),
		};
		const certificate: any = {
			aggregationBits: Buffer.alloc(2),
			signature: Buffer.alloc(2),
			timestamp,
		};
		const certificateWithHigherTimestamp: any = {
			aggregationBits: Buffer.alloc(2),
			signature: Buffer.alloc(2),
			timestamp: timestamp + 200,
		};
		const header: any = { timestamp: timestamp + 100 };

		it('should return if certificate is empty', () => {
			expect(
				checkCertificateTimestamp(txParamsWithEmptyCertificate, certificate, header),
			).toBeUndefined();
		});

		it('should throw error when certificate.timestamp is greater than header.timestamp', () => {
			expect(() =>
				checkCertificateTimestamp(txParams, certificateWithHigherTimestamp, header),
			).toThrow('Certificate is invalid due to invalid timestamp.');
		});

		it('should throw error when certificate.timestamp is equal to header.timestamp', () => {
			expect(() =>
				checkCertificateTimestamp(
					txParams,
					{ ...certificate, timestamp: header.timestamp },
					header,
				),
			).toThrow('Certificate is invalid due to invalid timestamp.');
		});

		it('should return undefined certificate.timestamp is less than header.timestamp', () => {
			expect(checkCertificateTimestamp(txParams, certificate, header)).toBeUndefined();
		});
	});

	describe('validateFormat', () => {
		const buildCCM = (obj: Partial<CCMsg>) => ({
			crossChainCommand: obj.crossChainCommand ?? CROSS_CHAIN_COMMAND_SIDECHAIN_TERMINATED,
			fee: obj.fee ?? BigInt(0),
			module: obj.module ?? MODULE_NAME_INTEROPERABILITY,
			nonce: obj.nonce ?? BigInt(1),
			params: obj.params ?? Buffer.alloc(MAX_CCM_SIZE - 100),
			receivingChainID: obj.receivingChainID ?? utils.intToBuffer(2, 4),
			sendingChainID: obj.sendingChainID ?? cryptography.utils.intToBuffer(20, 4),
			status: obj.status ?? CCMStatusCode.OK,
		});

		it('should throw if format does not fit ccmSchema', () => {
			expect(() =>
				validateFormat(
					buildCCM({
						module: '',
					}),
				),
			).toThrow("Property '.module' must NOT have fewer than 1 characters");
		});

		it('should throw if module does not pass Regex', () => {
			expect(() =>
				validateFormat(
					buildCCM({
						module: '!@#$%',
					}),
				),
			).toThrow('Cross-chain message module name must be alphanumeric.');
		});

		it('should throw if crossChainCommand does not pass Regex', () => {
			expect(() =>
				validateFormat(
					buildCCM({
						crossChainCommand: '!@#$$%',
					}),
				),
			).toThrow('Cross-chain message crossChainCommand name must be alphanumeric.');
		});

		it('should throw if byteLength exceeds MAX_CCM_SIZE', () => {
			expect(() =>
				validateFormat(
					buildCCM({
						params: Buffer.alloc(MAX_CCM_SIZE + 100),
					}),
				),
			).toThrow(`Cross-chain message size is larger than ${MAX_CCM_SIZE}.`);
		});

		it('should pass validateFormat check', () => {
			expect(() => validateFormat(buildCCM({}))).not.toThrow();
		});
	});

	describe('verifyLivenessConditionForRegisteredChains', () => {
		const certificate = {
			...defaultCertificate,
			timestamp: 100000,
		};
		const ccuParams = {
			activeValidatorsUpdate: {
				blsKeysUpdate: [],
				bftWeightsUpdate: [],
				bftWeightsUpdateBitmap: Buffer.from([]),
			},
			certificate: codec.encode(certificateSchema, certificate),
			inboxUpdate: {
				crossChainMessages: [utils.getRandomBytes(100)],
				messageWitnessHashes: [],
				outboxRootWitness: {
					bitmap: Buffer.alloc(0),
					siblingHashes: [],
				},
			},
			certificateThreshold: BigInt(99),
			sendingChainID: utils.getRandomBytes(4),
		};

		it('should throw if certificate timestamp is older than half of liveness limit', () => {
			expect(() =>
				verifyLivenessConditionForRegisteredChains(
					certificate.timestamp + LIVENESS_LIMIT / 2 + 1,
					ccuParams.certificate,
				),
			).toThrow('The first CCU with a non-empty inbox update cannot contain a certificate older');
		});

		it('should not throw if inbox update is not older than half of liveness limit', () => {
			expect(
				verifyLivenessConditionForRegisteredChains(
					certificate.timestamp + LIVENESS_LIMIT / 2,
					ccuParams.certificate,
				),
			).toBeUndefined();
			expect(validator.validate).toHaveBeenCalledWith(
				certificateSchema,
				expect.toBeObject() as Certificate,
			);
		});
	});

	describe('calculateNewActiveValidators', () => {
		const bytesToBuffer = (str: string): Buffer => {
			const val = BigInt(`0b${str}`).toString(16);
			return Buffer.from(`${val.length % 2 === 0 ? val : `0${val}`}`, 'hex');
		};

		const cases = [
			[
				// 2 new validators
				{
					activeValidators: [
						{
							blsKey: Buffer.from('02', 'hex'),
							bftWeight: BigInt(20),
						},
					],
					blsKeysUpdate: [Buffer.from('03', 'hex'), Buffer.from('04', 'hex')],
					bftWeightsUpdate: [BigInt(30), BigInt(40)],
					bftWeightsUpdateBitmap: bytesToBuffer('110'),
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
				},
			],
			[
				// 2 new validators and update bft weight for existing ones
				{
					activeValidators: [
						{
							blsKey: Buffer.from('02', 'hex'),
							bftWeight: BigInt(20),
						},
					],
					blsKeysUpdate: [Buffer.from('03', 'hex'), Buffer.from('04', 'hex')],
					bftWeightsUpdate: [BigInt(99), BigInt(30), BigInt(40)],
					bftWeightsUpdateBitmap: bytesToBuffer('111'),
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
				},
			],
			[
				// complete new set
				{
					activeValidators: [
						{
							blsKey: Buffer.from('02', 'hex'),
							bftWeight: BigInt(20),
						},
					],
					blsKeysUpdate: [
						Buffer.from('03', 'hex'),
						Buffer.from('04', 'hex'),
						Buffer.from('05', 'hex'),
					],
					bftWeightsUpdate: [BigInt(0), BigInt(30), BigInt(40), BigInt(99)],
					bftWeightsUpdateBitmap: bytesToBuffer('1111'),
					newValidators: [
						{
							blsKey: Buffer.from('03', 'hex'),
							bftWeight: BigInt(30),
						},
						{
							blsKey: Buffer.from('04', 'hex'),
							bftWeight: BigInt(40),
						},
						{
							blsKey: Buffer.from('05', 'hex'),
							bftWeight: BigInt(99),
						},
					],
				},
			],
			[
				// complete new set
				{
					activeValidators: [
						{
							blsKey: Buffer.from('02', 'hex'),
							bftWeight: BigInt(20),
						},
					],
					blsKeysUpdate: new Array(100).fill(0).map((_, i) => Buffer.from([i + 3])),
					bftWeightsUpdate: [BigInt(0), ...new Array(100).fill(0).map((_, i) => BigInt(i + 10))],
					bftWeightsUpdateBitmap: bytesToBuffer('0'.repeat(27) + '1'.repeat(101)),
					newValidators: new Array(100).fill(0).map((_, i) => ({
						blsKey: Buffer.from([i + 3]),
						bftWeight: BigInt(i + 10),
					})),
				},
			],
			[
				// only remove validator
				{
					activeValidators: [
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
					blsKeysUpdate: [],
					bftWeightsUpdate: [BigInt(0), BigInt(0), BigInt(0)],
					bftWeightsUpdateBitmap: bytesToBuffer('111'),
					newValidators: [],
				},
			],
			[
				// remove and change weight
				{
					activeValidators: [
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
					blsKeysUpdate: [],
					bftWeightsUpdate: [BigInt(90), BigInt(0), BigInt(0)],
					bftWeightsUpdateBitmap: bytesToBuffer('111'),
					newValidators: [
						{
							blsKey: Buffer.from('03', 'hex'),
							bftWeight: BigInt(90),
						},
					],
				},
			],
		];

		it.each(cases)('should compute new active validators', val => {
			expect(
				interopUtils.calculateNewActiveValidators(
					val.activeValidators,
					val.blsKeysUpdate,
					val.bftWeightsUpdate,
					val.bftWeightsUpdateBitmap,
				),
			).toEqual(val.newValidators);
		});

		it('should fail if more bftWeightsUpdate than the bftWeightsUpdateBitmap specifies are provided', () => {
			expect(() =>
				interopUtils.calculateNewActiveValidators(
					[
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
					[],
					[BigInt(90), BigInt(0), BigInt(0)],
					bytesToBuffer('1110'),
				),
			).toThrow('No BFT weights should be left');
		});
	});

	describe('isValidName', () => {
		it('should return true for a-z', () => {
			expect(isValidName('abcxyz')).toBeTrue();
		});

		it('should return true for 0-9', () => {
			expect(isValidName('01239')).toBeTrue();
		});

		it('should return true for of a-z0-9', () => {
			expect(isValidName('abcxyz01239')).toBeTrue();
		});

		it('should return true for !@$&_. chars', () => {
			expect(isValidName('abc_!@$&_._xyz')).toBeTrue();
		});

		it('should return true for [a-z0-9!@$&_.]+', () => {
			expect(isValidName('abc_!@$&_._xyz_abc_!@$&_._xyz')).toBeTrue();
		});

		it('should return false for space character', () => {
			expect(isValidName('abc xyz')).toBeFalse();
		});

		it('should return false for %', () => {
			expect(isValidName('abc%xyz')).toBeFalse();
		});

		it('should return false for (', () => {
			expect(isValidName('abc(xyz')).toBeFalse();
		});
	});
});
