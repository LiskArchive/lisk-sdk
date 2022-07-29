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
import * as merkleTree from '@liskhq/lisk-tree';
import { BlockAssets } from '@liskhq/lisk-chain';
import { when } from 'jest-when';
import { VerifyStatus } from '../../../../src';
import {
	CCM_STATUS_OK,
	CHAIN_REGISTERED,
	CHAIN_TERMINATED,
	EMPTY_BYTES,
	LIVENESS_LIMIT,
	MAINCHAIN_ID_BUFFER,
	MAX_NUM_VALIDATORS,
	MAX_UINT64,
	MODULE_ID_INTEROPERABILITY_BUFFER,
	STORE_PREFIX_CHAIN_DATA,
	STORE_PREFIX_CHAIN_VALIDATORS,
	STORE_PREFIX_CHANNEL_DATA,
	STORE_PREFIX_OUTBOX_ROOT,
	STORE_PREFIX_OWN_CHAIN_DATA,
	STORE_PREFIX_REGISTERED_NAMES,
	STORE_PREFIX_REGISTERED_NETWORK_IDS,
	STORE_PREFIX_TERMINATED_OUTBOX,
	STORE_PREFIX_TERMINATED_STATE,
} from '../../../../src/modules/interoperability/constants';
import {
	ccmSchema,
	channelSchema,
	genesisInteroperabilityStoreSchema,
	ownChainAccountSchema,
} from '../../../../src/modules/interoperability/schemas';
import {
	ChainAccount,
	ChannelData,
	CrossChainUpdateTransactionParams,
	InboxUpdate,
} from '../../../../src/modules/interoperability/types';
import {
	checkActiveValidatorsUpdate,
	checkCertificateTimestamp,
	checkCertificateValidity,
	checkInboxUpdateValidity,
	checkLivenessRequirementFirstCCU,
	checkValidatorsHashWithCertificate,
	checkValidCertificateLiveness,
	commonCCUExecutelogic,
	computeValidatorsHash,
	getIDAsKeyForStore,
	initGenesisStateUtil,
	updateActiveValidators,
	verifyCertificateSignature,
} from '../../../../src/modules/interoperability/utils';
import { certificateSchema } from '../../../../src/engine/consensus/certificate_generation/schema';
import { Certificate } from '../../../../src/engine/consensus/certificate_generation/types';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import { createGenesisBlockContext } from '../../../../src/testing';

jest.mock('@liskhq/lisk-cryptography', () => ({
	...jest.requireActual('@liskhq/lisk-cryptography'),
}));

describe('Utils', () => {
	const defaultActiveValidatorsUpdate = [
		{ blsKey: cryptography.utils.getRandomBytes(48), bftWeight: BigInt(1) },
		{ blsKey: cryptography.utils.getRandomBytes(48), bftWeight: BigInt(3) },
		{ blsKey: cryptography.utils.getRandomBytes(48), bftWeight: BigInt(4) },
		{ blsKey: cryptography.utils.getRandomBytes(48), bftWeight: BigInt(3) },
	];

	describe('updateActiveValidators', () => {
		const validator1 = {
			blsKey: cryptography.utils.getRandomBytes(48),
			bftWeight: BigInt(1),
		};
		const validator2 = {
			blsKey: cryptography.utils.getRandomBytes(48),
			bftWeight: BigInt(2),
		};
		const activeValidators = [validator1, validator2];

		it('should update the existing validator bftWeight with the updated one', () => {
			const activeValidatorsUpdate = [validator1, { ...validator2, bftWeight: BigInt(3) }];

			expect(updateActiveValidators(activeValidators, activeValidatorsUpdate)).toEqual(
				activeValidatorsUpdate,
			);
		});

		it('should add a validator with its bftWeight in lexicographical order', () => {
			const activeValidatorsUpdate = [
				validator1,
				validator2,
				{ blsKey: cryptography.utils.getRandomBytes(48), bftWeight: BigInt(1) },
			];

			// Should be in lexicographical order
			activeValidatorsUpdate.sort((v1, v2) => v1.blsKey.compare(v2.blsKey));

			expect(updateActiveValidators(activeValidators, activeValidatorsUpdate)).toEqual(
				activeValidatorsUpdate,
			);
		});

		it('should remove a validator when its bftWeight=0', () => {
			const activeValidatorsLocal = [...activeValidators];
			const validator3 = { blsKey: cryptography.utils.getRandomBytes(48), bftWeight: BigInt(3) };
			activeValidatorsLocal.push(validator3);
			const activeValidatorsUpdate = [
				validator1,
				validator2,
				{ ...validator3, bftWeight: BigInt(0) },
			];
			const updatedValidators = updateActiveValidators(
				activeValidatorsLocal,
				activeValidatorsUpdate,
			);

			const validator3Exists = updatedValidators.some(v => v.blsKey.equals(validator3.blsKey));
			expect(validator3Exists).toEqual(false);
		});
	});

	describe('checkLivenessRequirementFirstCCU', () => {
		const partnerChainAccount = {
			status: CHAIN_REGISTERED,
		};

		const txParamsEmptyCertificate = {
			certificate: EMPTY_BYTES,
			sendingChainID: utils.intToBuffer(4, 4),
		};

		const txParamsNonEmptyCertificate = {
			certificate: cryptography.utils.getRandomBytes(32),
		};

		it(`should return VerifyStatus.FAIL status when chain status ${CHAIN_REGISTERED} && certificate is empty`, () => {
			const result = checkLivenessRequirementFirstCCU(
				partnerChainAccount as ChainAccount,
				txParamsEmptyCertificate as CrossChainUpdateTransactionParams,
			);
			expect(result.status).toEqual(VerifyStatus.FAIL);
		});

		it(`should return status VerifyStatus.OK status when chain status ${CHAIN_REGISTERED} && certificate is non-empty`, () => {
			const result = checkLivenessRequirementFirstCCU(
				partnerChainAccount as ChainAccount,
				txParamsNonEmptyCertificate as CrossChainUpdateTransactionParams,
			);
			expect(result.status).toEqual(VerifyStatus.OK);
		});
	});

	describe('checkCertificateValidity', () => {
		const partnerChainAccount = {
			lastCertificate: {
				height: 20,
			},
		};

		const partnerChainAccountWithHigherHeight = {
			lastCertificate: {
				height: 40,
			},
		};

		const certificate = {
			blockID: cryptography.utils.getRandomBytes(20),
			height: 23,
			stateRoot: Buffer.alloc(2),
			timestamp: Math.floor(Date.now() / 1000),
			validatorsHash: cryptography.utils.getRandomBytes(20),
			aggregationBits: cryptography.utils.getRandomBytes(1),
			signature: cryptography.utils.getRandomBytes(32),
		};

		const certificateWithEmptyValues = {
			blockID: cryptography.utils.getRandomBytes(20),
			height: 23,
			stateRoot: EMPTY_BYTES,
			timestamp: Math.floor(Date.now() / 1000),
			validatorsHash: EMPTY_BYTES,
			aggregationBits: EMPTY_BYTES,
			signature: EMPTY_BYTES,
		};

		const encodedCertificate = codec.encode(certificateSchema, certificate);
		const encodedWithEmptyValuesCertificate = codec.encode(
			certificateSchema,
			certificateWithEmptyValues,
		);

		it('should return VerifyStatus.FAIL when certificate required properties are missing', () => {
			const { status, error } = checkCertificateValidity(
				partnerChainAccount as ChainAccount,
				encodedWithEmptyValuesCertificate,
			);

			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toEqual('Certificate is missing required values.');
		});

		it('should return VerifyStatus.FAIL when certificate height is less than or equal to last certificate height', () => {
			const { status, error } = checkCertificateValidity(
				partnerChainAccountWithHigherHeight as ChainAccount,
				encodedCertificate,
			);

			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toEqual(
				'Certificate height should be greater than last certificate height.',
			);
		});

		it('should return VerifyStatus.OK when certificate has all values and height greater than last certificate height', () => {
			const { status, error } = checkCertificateValidity(
				partnerChainAccount as ChainAccount,
				encodedCertificate,
			);

			expect(status).toEqual(VerifyStatus.OK);
			expect(error).toBeUndefined();
		});
	});

	describe('checkActiveValidatorsUpdate', () => {
		const activeValidatorsUpdate = [...defaultActiveValidatorsUpdate].sort((v1, v2) =>
			v2.blsKey.compare(v1.blsKey),
		);
		const sortedValidatorsList = [...defaultActiveValidatorsUpdate].sort((v1, v2) =>
			v1.blsKey.compare(v2.blsKey),
		);

		const txParams = {
			activeValidatorsUpdate,
			newCertificateThreshold: BigInt(10),
			certificate: Buffer.alloc(2),
			sendingChainID: utils.intToBuffer(2, 4),
			inboxUpdate: {},
		};

		const txParamsWithEmptyCertificate = {
			activeValidatorsUpdate,
			newCertificateThreshold: BigInt(10),
			certificate: EMPTY_BYTES,
			sendingChainID: utils.intToBuffer(2, 4),
			inboxUpdate: {},
		};

		const txParamsSortedValidators = {
			activeValidatorsUpdate: sortedValidatorsList,
			newCertificateThreshold: BigInt(10),
			certificate: Buffer.alloc(2),
			sendingChainID: utils.intToBuffer(2, 4),
			inboxUpdate: {},
		};

		it('should return VerifyStatus.FAIL when certificate is empty', () => {
			const { status, error } = checkActiveValidatorsUpdate(
				txParamsWithEmptyCertificate as CrossChainUpdateTransactionParams,
			);

			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toEqual(
				'Certificate cannot be empty when activeValidatorsUpdate is non-empty or newCertificateThreshold > 0.',
			);
		});

		it('should return VerifyStatus.FAIL when validators blsKeys are not unique and lexicographically ordered', () => {
			const { status, error } = checkActiveValidatorsUpdate(
				txParams as CrossChainUpdateTransactionParams,
			);

			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toEqual(
				'Validators blsKeys must be unique and lexicographically ordered.',
			);
		});

		it('should return VerifyStatus.OK', () => {
			const { status, error } = checkActiveValidatorsUpdate(
				txParamsSortedValidators as CrossChainUpdateTransactionParams,
			);

			expect(status).toEqual(VerifyStatus.OK);
			expect(error).toBeUndefined();
		});
	});

	describe('checkValidCertificateLiveness', () => {
		const inboxUpdate = {
			crossChainMessages: [Buffer.alloc(1)],
			messageWitness: {
				partnerChainOutboxSize: BigInt(2),
				siblingHashes: [Buffer.alloc(1)],
			},
			outboxRootWitness: {
				bitmap: Buffer.alloc(1),
				siblingHashes: [Buffer.alloc(1)],
			},
		} as InboxUpdate;
		const inboxUpdateEmpty = {
			crossChainMessages: [],
			messageWitness: {
				partnerChainOutboxSize: BigInt(0),
				siblingHashes: [],
			},
			outboxRootWitness: {
				bitmap: Buffer.alloc(1),
				siblingHashes: [],
			},
		} as InboxUpdate;
		const txParams: any = {
			inboxUpdate,
		};
		const timestamp = Date.now();
		const header: any = {
			timestamp,
		};
		const invalidCertificate: any = {
			timestamp: timestamp - LIVENESS_LIMIT / 2,
		};
		const certificate: any = {
			timestamp: timestamp + 100,
		};

		it('should throw error when certificate has passed liveness condition', () => {
			expect(() => checkValidCertificateLiveness(txParams, header, invalidCertificate)).toThrow(
				`Certificate is not valid as it passed Liveness limit of ${LIVENESS_LIMIT} seconds.`,
			);
		});

		it('should pass when inboxUpdate is undefined', () => {
			expect(
				checkValidCertificateLiveness(
					{ inboxUpdate: inboxUpdateEmpty } as any,
					header,
					certificate,
				),
			).toBeUndefined();
		});

		it('should pass successfully', () => {
			expect(checkValidCertificateLiveness(txParams, header, certificate)).toBeUndefined();
		});
	});

	describe('verifyCertificateSignature', () => {
		const activeValidatorsUpdate = [...defaultActiveValidatorsUpdate];
		const ceritificate: Certificate = {
			blockID: cryptography.utils.getRandomBytes(20),
			height: 21,
			timestamp: Math.floor(Date.now() / 1000),
			stateRoot: cryptography.utils.getRandomBytes(38),
			validatorsHash: cryptography.utils.getRandomBytes(48),
			aggregationBits: cryptography.utils.getRandomBytes(38),
			signature: cryptography.utils.getRandomBytes(32),
		};
		const encodedCertificate = codec.encode(certificateSchema, ceritificate);
		const txParams: any = {
			certificate: encodedCertificate,
		};
		const txParamsWithEmptyCertificate: any = {
			certificate: Buffer.alloc(0),
		};
		const partnerValidators: any = {
			activeValidators: activeValidatorsUpdate,
			certificateThreshold: 10,
		};
		const partnerChainAccount: any = { networkID: cryptography.utils.getRandomBytes(32) };

		it('should return VerifyStatus.OK if certificate is empty', () => {
			jest.spyOn(cryptography.bls, 'verifyWeightedAggSig').mockReturnValue(true);
			const { status, error } = verifyCertificateSignature(
				txParamsWithEmptyCertificate,
				partnerValidators,
				partnerChainAccount,
			);

			expect(status).toEqual(VerifyStatus.OK);
			expect(error?.message).toBeUndefined();
			expect(cryptography.bls.verifyWeightedAggSig).not.toHaveBeenCalled();
		});

		it('should return VerifyStatus.FAIL when certificate signature verification fails', () => {
			jest.spyOn(cryptography.bls, 'verifyWeightedAggSig').mockReturnValue(false);
			const { status, error } = verifyCertificateSignature(
				txParams,
				partnerValidators,
				partnerChainAccount,
			);

			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toEqual('Certificate is invalid due to invalid signature.');
			expect(cryptography.bls.verifyWeightedAggSig).toHaveBeenCalledTimes(1);
		});

		it('should return VerifyStatus.OK when certificate signature verification passes', () => {
			jest.spyOn(cryptography.bls, 'verifyWeightedAggSig').mockReturnValue(true);

			const { status, error } = verifyCertificateSignature(
				txParams,
				partnerValidators,
				partnerChainAccount,
			);

			expect(status).toEqual(VerifyStatus.OK);
			expect(error).toBeUndefined();
			expect(cryptography.bls.verifyWeightedAggSig).toHaveBeenCalledTimes(1);
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

		it('should return undefined certificate.timestamp is less than header.timestamp', () => {
			expect(checkCertificateTimestamp(txParams, certificate, header)).toBeUndefined();
		});
	});

	describe('checkValidatorsHashWithCertificate', () => {
		const activeValidatorsUpdate = [...defaultActiveValidatorsUpdate];

		const partnerValidators: any = {
			certificateThreshold: BigInt(10),
			activeValidators: activeValidatorsUpdate.map(v => ({
				blsKey: v.blsKey,
				bftWeight: v.bftWeight + BigInt(1),
			})),
		};
		const validatorsHash = computeValidatorsHash(
			activeValidatorsUpdate,
			partnerValidators.certificateThreshold,
		);

		const certificate: Certificate = {
			aggregationBits: Buffer.alloc(2),
			signature: Buffer.alloc(2),
			validatorsHash,
			blockID: cryptography.utils.getRandomBytes(20),
			height: 20,
			stateRoot: cryptography.utils.getRandomBytes(32),
			timestamp: Math.floor(Date.now() / 1000),
		};

		const encodedCertificate = codec.encode(certificateSchema, certificate);

		const txParams: any = {
			certificate: encodedCertificate,
			activeValidatorsUpdate,
			newCertificateThreshold: BigInt(10),
		};

		it('should return VerifyStatus.FAIL when certificate is empty', () => {
			const txParamsWithIncorrectHash = { ...txParams, certificate: EMPTY_BYTES };
			const { status, error } = checkValidatorsHashWithCertificate(
				txParamsWithIncorrectHash,
				partnerValidators,
			);

			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toEqual(
				'Certificate cannot be empty when activeValidatorsUpdate or newCertificateThreshold has a non-empty value.',
			);
		});

		it('should return VerifyStatus.FAIL when certificate has missing fields', () => {
			const txParamsWithIncorrectHash = { ...txParams, certificate: Buffer.alloc(2) };
			const { status, error } = checkValidatorsHashWithCertificate(
				txParamsWithIncorrectHash,
				partnerValidators,
			);

			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toEqual(
				'Certificate should have all required values when activeValidatorsUpdate or newCertificateThreshold has a non-empty value.',
			);
		});

		it('should return VerifyStatus.FAIL when validators hash is incorrect', () => {
			const certificateInvalidValidatorHash: Certificate = {
				aggregationBits: Buffer.alloc(2),
				signature: Buffer.alloc(2),
				validatorsHash: cryptography.utils.getRandomBytes(48),
				blockID: cryptography.utils.getRandomBytes(20),
				height: 20,
				stateRoot: cryptography.utils.getRandomBytes(32),
				timestamp: Math.floor(Date.now() / 1000),
			};
			const invalidEncodedCertificate = codec.encode(
				certificateSchema,
				certificateInvalidValidatorHash,
			);

			const txParamsWithIncorrectHash = { ...txParams, certificate: invalidEncodedCertificate };
			const { status, error } = checkValidatorsHashWithCertificate(
				txParamsWithIncorrectHash,
				partnerValidators,
			);

			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toEqual('Validators hash given in the certificate is incorrect.');
		});

		it('should return VerifyStatus.OK when validators hash is correct', () => {
			const txParamsWithCorrectHash = { ...txParams };
			const { status, error } = checkValidatorsHashWithCertificate(
				txParamsWithCorrectHash,
				partnerValidators,
			);

			expect(status).toEqual(VerifyStatus.OK);
			expect(error).toBeUndefined();
		});

		it('should return VerifyStatus.OK when activeValidatorsUpdate.length === 0 and newCertificateThreshold === 0', () => {
			const ineligibleTxParams = {
				...txParams,
				activeValidatorsUpdate: [],
				newCertificateThreshold: BigInt(0),
			};
			const { status, error } = checkValidatorsHashWithCertificate(
				ineligibleTxParams,
				partnerValidators,
			);

			expect(status).toEqual(VerifyStatus.OK);
			expect(error).toBeUndefined();
		});

		it('should return VerifyStatus.OK when newCertificateThreshold === 0 but activeValidatorsUpdate.length > 0', () => {
			const { status, error } = checkValidatorsHashWithCertificate(
				{ ...txParams, newCertificateThreshold: BigInt(0) },
				partnerValidators,
			);

			expect(status).toEqual(VerifyStatus.OK);
			expect(error).toBeUndefined();
		});

		it('should return VerifyStatus.OK when newCertificateThreshold > 0 but activeValidatorsUpdate.length === 0', () => {
			const { status, error } = checkValidatorsHashWithCertificate(
				{ ...txParams, activeValidatorsUpdate: [] },
				partnerValidators,
			);

			expect(status).toEqual(VerifyStatus.OK);
			expect(error).toBeUndefined();
		});
	});

	describe('checkInboxUpdateValidity', () => {
		const activeValidatorsUpdate = [...defaultActiveValidatorsUpdate];

		const partnerChainOutboxRoot = cryptography.utils.getRandomBytes(32);
		const inboxTree = {
			root: Buffer.from('7f9d96a09a3fd17f3478eb7bef3a8bda00e1238b', 'hex'),
			appendPath: [
				Buffer.from('6d391e95b7cb484862aa577320dbb4999971569e0b7c21fc02e9fda4d1d8485c', 'hex'),
			],
			size: 1,
		};
		const outboxTree = {
			root: Buffer.from('7f9d96a09a3fd17f3478eb7bef3a8bda00e1238b', 'hex'),
			appendPath: [
				Buffer.from('6d391e95b7cb484862aa577320dbb4999971569e0b7c21fc02e9fda4d1d8485c', 'hex'),
			],
			size: 1,
		};
		const partnerChannelData: ChannelData = {
			inbox: inboxTree,
			messageFeeTokenID: {
				chainID: utils.intToBuffer(1, 4),
				localID: utils.intToBuffer(0, 4),
			},
			outbox: outboxTree,
			partnerChainOutboxRoot,
		};

		const defaultSendingChainID = utils.intToBuffer(20, 4);

		const defaultCCMs = [
			{
				crossChainCommandID: utils.intToBuffer(1, 4),
				fee: BigInt(0),
				moduleID: utils.intToBuffer(1, 4),
				nonce: BigInt(1),
				params: Buffer.alloc(2),
				receivingChainID: utils.intToBuffer(2, 4),
				sendingChainID: defaultSendingChainID,
				status: CCM_STATUS_OK,
			},
			{
				crossChainCommandID: utils.intToBuffer(2, 4),
				fee: BigInt(0),
				moduleID: utils.intToBuffer(1, 4),
				nonce: BigInt(1),
				params: Buffer.alloc(2),
				receivingChainID: utils.intToBuffer(3, 4),
				sendingChainID: defaultSendingChainID,
				status: CCM_STATUS_OK,
			},
		];

		const inboxUpdateCCMs = [
			{
				crossChainCommandID: utils.intToBuffer(1, 4),
				fee: BigInt(0),
				moduleID: utils.intToBuffer(1, 4),
				nonce: BigInt(2),
				params: Buffer.alloc(4),
				receivingChainID: utils.intToBuffer(90, 4),
				sendingChainID: defaultSendingChainID,
				status: CCM_STATUS_OK,
			},
			{
				crossChainCommandID: utils.intToBuffer(2, 4),
				fee: BigInt(0),
				moduleID: utils.intToBuffer(1, 4),
				nonce: BigInt(10),
				params: Buffer.alloc(4),
				receivingChainID: utils.intToBuffer(70, 4),
				sendingChainID: defaultSendingChainID,
				status: CCM_STATUS_OK,
			},
		];
		const defaultCCMsEncoded = defaultCCMs.map(ccm => codec.encode(ccmSchema, ccm));
		const inboxUpdateCCMsEncoded = inboxUpdateCCMs.map(ccm => codec.encode(ccmSchema, ccm));

		const inboxUpdateEmpty = {
			crossChainMessages: [],
			messageWitness: {
				partnerChainOutboxSize: BigInt(0),
				siblingHashes: [],
			},
			outboxRootWitness: {
				bitmap: Buffer.alloc(0),
				siblingHashes: [],
			},
		};
		const inboxUpdate = {
			crossChainMessages: inboxUpdateCCMsEncoded,
			messageWitness: {
				partnerChainOutboxSize: BigInt(1),
				siblingHashes: [cryptography.utils.getRandomBytes(32)],
			},
			outboxRootWitness: {
				bitmap: cryptography.utils.getRandomBytes(32),
				siblingHashes: [cryptography.utils.getRandomBytes(32)],
			},
		};
		const certificate: Certificate = {
			blockID: cryptography.utils.getRandomBytes(20),
			height: 20,
			stateRoot: cryptography.utils.getRandomBytes(32),
			timestamp: Math.floor(Date.now() / 1000),
			validatorsHash: cryptography.utils.getRandomBytes(48),
			aggregationBits: cryptography.utils.getRandomBytes(1),
			signature: cryptography.utils.getRandomBytes(32),
		};

		const encodedCertificate = codec.encode(certificateSchema, certificate);
		const txParams: CrossChainUpdateTransactionParams = {
			certificate: encodedCertificate,
			activeValidatorsUpdate,
			newCertificateThreshold: BigInt(10),
			inboxUpdate,
			sendingChainID: utils.intToBuffer(2, 4),
		};

		let newInboxRoot: Buffer;
		let newInboxAppendPath: Buffer[] = [];
		let newInboxSize = 0;

		beforeEach(async () => {
			for (const ccm of defaultCCMsEncoded) {
				const { appendPath, size, root } = merkleTree.regularMerkleTree.calculateMerkleRoot({
					value: ccm,
					appendPath: newInboxAppendPath,
					size: newInboxSize,
				});
				newInboxAppendPath = appendPath;
				newInboxSize = size;
				newInboxRoot = root;
			}
			partnerChannelData.partnerChainOutboxRoot = newInboxRoot;
		});

		it('should return VerifyStatus.OK when inboxUpdate is empty', () => {
			const txParamsEmptyInboxUpdate = { ...txParams, inboxUpdate: inboxUpdateEmpty };
			const { status, error } = checkInboxUpdateValidity(
				txParamsEmptyInboxUpdate,
				partnerChannelData,
			);
			expect(status).toEqual(VerifyStatus.OK);
			expect(error).toBeUndefined();
		});

		describe('Non-empty certificate and inboxUpdate', () => {
			it('should update inboxRoot when when messageWitness is non-empty', () => {
				const smtVerifySpy = jest
					.spyOn(merkleTree.sparseMerkleTree, 'verify')
					.mockReturnValue({} as never);
				const { status, error } = checkInboxUpdateValidity(txParams, partnerChannelData);
				expect(status).toEqual(VerifyStatus.OK);
				expect(error).toBeUndefined();
				expect(smtVerifySpy).toHaveBeenCalled();
			});

			it('should not call calculateRootFromRightWitness when messageWitness is empty', () => {
				const calculateRootFromRightWitnessSpy = jest.spyOn(
					merkleTree.regularMerkleTree,
					'calculateRootFromRightWitness',
				);
				const smtVerifySpy = jest
					.spyOn(merkleTree.sparseMerkleTree, 'verify')
					.mockReturnValue(true);

				const inboxUpdateMessageWitnessEmpty = {
					crossChainMessages: inboxUpdateCCMsEncoded,
					messageWitness: {
						partnerChainOutboxSize: BigInt(0),
						siblingHashes: [],
					},
					outboxRootWitness: {
						bitmap: cryptography.utils.getRandomBytes(32),
						siblingHashes: [cryptography.utils.getRandomBytes(32)],
					},
				};

				const txParamsEmptyMessageWitness: CrossChainUpdateTransactionParams = {
					certificate: encodedCertificate,
					activeValidatorsUpdate,
					newCertificateThreshold: BigInt(10),
					inboxUpdate: inboxUpdateMessageWitnessEmpty,
					sendingChainID: utils.intToBuffer(2, 4),
				};
				const { status, error } = checkInboxUpdateValidity(
					txParamsEmptyMessageWitness,
					partnerChannelData,
				);
				expect(status).toEqual(VerifyStatus.OK);
				expect(error).toBeUndefined();
				expect(calculateRootFromRightWitnessSpy).not.toHaveBeenCalled();
				expect(smtVerifySpy).toHaveBeenCalled();
			});

			it('should return VerifyStatus.FAIL if outboxWitness fails SMT.verify', () => {
				const calculateRootFromRightWitnessSpy = jest
					.spyOn(merkleTree.regularMerkleTree, 'calculateRootFromRightWitness')
					.mockReturnValue({} as never);
				const smtVerifySpy = jest
					.spyOn(merkleTree.sparseMerkleTree, 'verify')
					.mockReturnValue(false);

				const { status, error } = checkInboxUpdateValidity(txParams, partnerChannelData);
				expect(status).toEqual(VerifyStatus.FAIL);
				expect(error?.message).toEqual(
					'Failed at verifying state root when messageWitness and certificate are non-empty.',
				);
				expect(calculateRootFromRightWitnessSpy).toHaveBeenCalled();
				expect(smtVerifySpy).toHaveBeenCalled();
			});

			it('should return VerifyStatus.OK on SMT.verify true for non-empty certificate and inboxUpdate', () => {
				const calculateRootFromRightWitnessSpy = jest
					.spyOn(merkleTree.regularMerkleTree, 'calculateRootFromRightWitness')
					.mockReturnValue({} as never);
				const smtVerifySpy = jest
					.spyOn(merkleTree.sparseMerkleTree, 'verify')
					.mockReturnValue(true);

				const { status, error } = checkInboxUpdateValidity(txParams, partnerChannelData);
				expect(status).toEqual(VerifyStatus.OK);
				expect(error).toBeUndefined();
				expect(calculateRootFromRightWitnessSpy).toHaveBeenCalled();
				expect(smtVerifySpy).toHaveBeenCalled();
			});
		});

		describe('Empty certificate and non-empty inboxUpdate', () => {
			const txParamsWithEmptyCertificate = {
				...txParams,
				certificate: codec.encode(certificateSchema, {
					blockID: Buffer.alloc(0),
					height: 0,
					timestamp: 0,
					stateRoot: Buffer.alloc(0),
					validatorsHash: Buffer.alloc(0),
					aggregationBits: Buffer.alloc(0),
					signature: Buffer.alloc(0),
				}),
			};

			it('should update newInboxRoot when messageWitness is non-empty', () => {
				const calculateRootFromRightWitnessSpy = jest
					.spyOn(merkleTree.regularMerkleTree, 'calculateRootFromRightWitness')
					.mockReturnValue(partnerChannelData.partnerChainOutboxRoot);

				const { status, error } = checkInboxUpdateValidity(
					txParamsWithEmptyCertificate,
					partnerChannelData,
				);
				expect(status).toEqual(VerifyStatus.OK);
				expect(error).toBeUndefined();
				expect(calculateRootFromRightWitnessSpy).toHaveBeenCalled();
			});

			it('should should not call calculateRootFromRightWitness when messageWitness is empty', () => {
				const txParamsEmptyMessageWitness = {
					...txParams,
					certificate: codec.encode(certificateSchema, {
						blockID: Buffer.alloc(0),
						height: 0,
						timestamp: 0,
						stateRoot: Buffer.alloc(0),
						validatorsHash: Buffer.alloc(0),
						aggregationBits: Buffer.alloc(0),
						signature: Buffer.alloc(0),
					}),
					inboxUpdate: {
						...txParams.inboxUpdate,
						messageWitness: { partnerChainOutboxSize: BigInt(0), siblingHashes: [] },
					},
				};
				const calculateRootFromRightWitnessSpy = jest.spyOn(
					merkleTree.regularMerkleTree,
					'calculateRootFromRightWitness',
				);
				const calculateMerkleRootSpy = jest
					.spyOn(merkleTree.regularMerkleTree, 'calculateMerkleRoot')
					.mockReturnValue({ root: partnerChannelData.partnerChainOutboxRoot } as never);

				const { status, error } = checkInboxUpdateValidity(
					txParamsEmptyMessageWitness,
					partnerChannelData,
				);
				expect(status).toEqual(VerifyStatus.OK);
				expect(error).toBeUndefined();
				expect(calculateMerkleRootSpy).toHaveBeenCalledTimes(inboxUpdateCCMsEncoded.length);
				expect(calculateRootFromRightWitnessSpy).not.toHaveBeenCalled();
			});

			it('should return VerifyStatus.FAIL when calculated newInboxRoot is not equal to partnerChainOutboxRoot', () => {
				const txParamsEmptyMessageWitness = {
					...txParams,
					certificate: codec.encode(certificateSchema, {
						blockID: Buffer.alloc(0),
						height: 0,
						timestamp: 0,
						stateRoot: Buffer.alloc(0),
						validatorsHash: Buffer.alloc(0),
						aggregationBits: Buffer.alloc(0),
						signature: Buffer.alloc(0),
					}),
					inboxUpdate: {
						...txParams.inboxUpdate,
						messageWitness: { partnerChainOutboxSize: BigInt(0), siblingHashes: [] },
					},
				};
				const calculateRootFromRightWitnessSpy = jest.spyOn(
					merkleTree.regularMerkleTree,
					'calculateRootFromRightWitness',
				);
				const calculateMerkleRootSpy = jest
					.spyOn(merkleTree.regularMerkleTree, 'calculateMerkleRoot')
					.mockReturnValue({ root: cryptography.utils.getRandomBytes(32) } as never);

				const { status, error } = checkInboxUpdateValidity(
					txParamsEmptyMessageWitness,
					partnerChannelData,
				);
				expect(status).toEqual(VerifyStatus.FAIL);
				expect(error?.message).toEqual(
					'Failed at verifying state root when messageWitness is non-empty and certificate is empty.',
				);
				expect(calculateMerkleRootSpy).toHaveBeenCalledTimes(inboxUpdateCCMsEncoded.length);
				expect(calculateRootFromRightWitnessSpy).not.toHaveBeenCalled();
			});
		});
	});

	describe('commonCCUExecutelogic', () => {
		const chainIDBuffer = getIDAsKeyForStore(1);
		const defaultCalculatedRootFromRightWitness = cryptography.utils.getRandomBytes(20);
		let activeValidatorsUpdate: any;
		let inboxUpdate: InboxUpdate;
		let certificate: any;
		let partnerChainAccount: any;
		let partnerValidatorStore: any;
		let partnerChainStore: any;
		let partnerValidators: any;
		let params: any;
		let partnerChannelStoreMock: any;
		let partnerChannelData: any;
		let context: any;
		let calculateRootFromRightWitness: any;

		beforeEach(async () => {
			activeValidatorsUpdate = [
				{ blsKey: cryptography.utils.getRandomBytes(48), bftWeight: BigInt(1) },
				{ blsKey: cryptography.utils.getRandomBytes(48), bftWeight: BigInt(3) },
				{ blsKey: cryptography.utils.getRandomBytes(48), bftWeight: BigInt(4) },
				{ blsKey: cryptography.utils.getRandomBytes(48), bftWeight: BigInt(3) },
			];
			inboxUpdate = {
				crossChainMessages: [Buffer.alloc(1)],
				messageWitness: {
					partnerChainOutboxSize: BigInt(2),
					siblingHashes: [Buffer.alloc(1)],
				},
				outboxRootWitness: {
					bitmap: Buffer.alloc(1),
					siblingHashes: [Buffer.alloc(1)],
				},
			} as InboxUpdate;

			certificate = {
				stateRoot: Buffer.alloc(2),
				validatorsHash: Buffer.alloc(2),
				height: 10,
				timestamp: Date.now(),
			};
			partnerChainAccount = {
				lastCertificate: { ...certificate, height: 5 },
				height: 8,
			};
			partnerValidatorStore = {
				setWithSchema: jest.fn(),
			};
			partnerChainStore = {
				setWithSchema: jest.fn(),
			};
			partnerValidators = {
				activeValidators: activeValidatorsUpdate,
				certificateThreshold: BigInt(12),
			};
			params = {
				activeValidatorsUpdate,
				newCertificateThreshold: BigInt(10),
				certificate: Buffer.alloc(2),
				inboxUpdate,
			};
			partnerChannelStoreMock = {
				getWithSchema: jest.fn(),
				setWithSchema: jest.fn(),
			};
			partnerChannelData = {
				partnerChainOutboxRoot: Buffer.alloc(1),
				inbox: {
					size: BigInt(2),
					appendPath: [Buffer.alloc(1)],
					root: cryptography.utils.getRandomBytes(20),
				},
			};
			context = {
				getStore: jest.fn(),
				params,
				transaction: {
					moduleID: utils.intToBuffer(1, 4),
				},
			};

			when(context.getStore)
				.calledWith(context.transaction.moduleID, STORE_PREFIX_CHANNEL_DATA)
				.mockReturnValueOnce(partnerChannelStoreMock);

			when(partnerChannelStoreMock.getWithSchema)
				.calledWith(chainIDBuffer, channelSchema)
				.mockResolvedValueOnce(partnerChannelData as never);

			when(partnerChannelStoreMock.setWithSchema)
				.calledWith(chainIDBuffer, partnerChannelData, channelSchema)
				.mockResolvedValueOnce({} as never);
			calculateRootFromRightWitness = jest
				.spyOn(merkleTree.regularMerkleTree, 'calculateRootFromRightWitness')
				.mockReturnValue(defaultCalculatedRootFromRightWitness);
		});

		it('should run successfully and return undefined when newCertificateThreshold is non-zero', async () => {
			await expect(
				commonCCUExecutelogic({
					certificate,
					partnerChainAccount,
					partnerValidatorStore,
					partnerChainStore,
					partnerValidators,
					chainIDBuffer,
					context,
				}),
			).resolves.toBeUndefined();
			expect(partnerValidatorStore.setWithSchema).toHaveBeenCalledTimes(1);
			expect(partnerChainStore.setWithSchema).toHaveBeenCalledTimes(1);
			expect(partnerChannelStoreMock.getWithSchema).toHaveBeenCalledTimes(1);
			expect(partnerChannelStoreMock.setWithSchema).toHaveBeenCalledTimes(1);
			expect(context.getStore).toHaveBeenCalledTimes(1);
			expect(partnerValidators.certificateThreshold).toEqual(params.newCertificateThreshold);
			expect(partnerChannelData.partnerChainOutboxRoot).toEqual(
				defaultCalculatedRootFromRightWitness,
			);
		});

		it('should run successfully and return undefined when newCertificateThreshold is zero', async () => {
			const paramsWithThresholdZero = {
				activeValidatorsUpdate,
				newCertificateThreshold: BigInt(0),
				certificate: Buffer.alloc(2),
				inboxUpdate,
			};
			const contextWithThresholdZero: any = { ...context, params: paramsWithThresholdZero };

			await expect(
				commonCCUExecutelogic({
					certificate,
					partnerChainAccount,
					partnerValidatorStore,
					partnerChainStore,
					partnerValidators,
					chainIDBuffer,
					context: contextWithThresholdZero,
				}),
			).resolves.toBeUndefined();
			expect(partnerValidatorStore.setWithSchema).toHaveBeenCalledTimes(1);
			expect(partnerChainStore.setWithSchema).toHaveBeenCalledTimes(1);
			expect(partnerChannelStoreMock.getWithSchema).toHaveBeenCalledTimes(1);
			expect(partnerChannelStoreMock.setWithSchema).toHaveBeenCalledTimes(1);
			expect(context.getStore).toHaveBeenCalledTimes(1);
			expect(partnerValidators.certificateThreshold).toEqual(BigInt(12)); // original partnerValidator value unchanged
			expect(partnerChannelData.partnerChainOutboxRoot).toEqual(
				defaultCalculatedRootFromRightWitness,
			);
		});

		it('should run successfully and return undefined when certificate is empty', async () => {
			const paramsWithEmptyCertificate = {
				activeValidatorsUpdate,
				newCertificateThreshold: params.newCertificateThreshold,
				certificate: EMPTY_BYTES,
				inboxUpdate,
			};
			const contextWithEmptyCertificate: any = { ...context, params: paramsWithEmptyCertificate };

			await expect(
				commonCCUExecutelogic({
					certificate: {} as any,
					partnerChainAccount,
					partnerValidatorStore,
					partnerChainStore,
					partnerValidators,
					chainIDBuffer,
					context: contextWithEmptyCertificate,
				}),
			).resolves.toBeUndefined();
			expect(partnerValidatorStore.setWithSchema).toHaveBeenCalledTimes(1);
			expect(partnerChainStore.setWithSchema).not.toHaveBeenCalled();
			expect(partnerChannelStoreMock.getWithSchema).toHaveBeenCalledTimes(1);
			expect(partnerChannelStoreMock.setWithSchema).toHaveBeenCalledTimes(1);
			expect(context.getStore).toHaveBeenCalledTimes(1);
			expect(partnerChainAccount.lastCertificate.height).toEqual(5); // original partnerValidator value unchange
			expect(partnerChannelData.partnerChainOutboxRoot).toEqual(
				defaultCalculatedRootFromRightWitness,
			);
			expect(calculateRootFromRightWitness).toHaveBeenCalled();
		});

		it('should run successfully and return undefined when messageWitness is empty', async () => {
			const paramsWithEmptyMessageWitness = {
				activeValidatorsUpdate,
				newCertificateThreshold: params.newCertificateThreshold,
				certificate: params.certificate,
				inboxUpdate: {
					...inboxUpdate,
					messageWitness: {
						partnerChainOutboxSize: BigInt(0),
						siblingHashes: [],
					},
				},
			};
			const contextWithEmptyMessageWitness: any = {
				...context,
				params: paramsWithEmptyMessageWitness,
			};

			await expect(
				commonCCUExecutelogic({
					certificate,
					partnerChainAccount,
					partnerValidatorStore,
					partnerChainStore,
					partnerValidators,
					chainIDBuffer,
					context: contextWithEmptyMessageWitness,
				}),
			).resolves.toBeUndefined();
			expect(partnerValidatorStore.setWithSchema).toHaveBeenCalledTimes(1);
			expect(partnerChainStore.setWithSchema).toHaveBeenCalledTimes(1);
			expect(partnerChannelStoreMock.getWithSchema).toHaveBeenCalledTimes(1);
			expect(partnerChannelStoreMock.setWithSchema).toHaveBeenCalledTimes(1);
			expect(context.getStore).toHaveBeenCalledTimes(1);
			expect(partnerChainAccount.lastCertificate.height).toEqual(certificate.height);
			expect(partnerChannelData.partnerChainOutboxRoot).toEqual(partnerChannelData.inbox.root);
			expect(calculateRootFromRightWitness).not.toHaveBeenCalled();
		});
	});

	describe('initGenesisStateUtil', () => {
		const { getRandomBytes } = cryptography.utils;
		const chainID = MODULE_ID_INTEROPERABILITY_BUFFER;
		const timestamp = 2592000 * 100;
		const chainAccount = {
			name: 'account1',
			networkID: Buffer.alloc(0),
			lastCertificate: {
				height: 567467,
				timestamp: timestamp - 500000,
				stateRoot: Buffer.alloc(0),
				validatorsHash: Buffer.alloc(0),
			},
			status: 2739,
		};
		const sidechainChainAccount = {
			name: 'sidechain1',
			networkID: getRandomBytes(32),
			lastCertificate: {
				height: 10,
				stateRoot: utils.getRandomBytes(32),
				timestamp: 100,
				validatorsHash: utils.getRandomBytes(32),
			},
			status: CHAIN_TERMINATED,
		};
		const ownChainAccount = {
			name: 'mainchain',
			id: MAINCHAIN_ID_BUFFER,
			nonce: BigInt('0'),
		};
		const channelData = {
			inbox: {
				appendPath: [Buffer.alloc(1), Buffer.alloc(1)],
				root: cryptography.utils.getRandomBytes(38),
				size: 18,
			},
			messageFeeTokenID: { chainID: utils.intToBuffer(1, 4), localID: utils.intToBuffer(0, 4) },
			outbox: {
				appendPath: [Buffer.alloc(1), Buffer.alloc(1)],
				root: cryptography.utils.getRandomBytes(38),
				size: 18,
			},
			partnerChainOutboxRoot: cryptography.utils.getRandomBytes(38),
		};
		const outboxRoot = { root: getRandomBytes(32) };
		const validatorsHashInput = {
			activeValidators: [
				{
					blsKey: Buffer.from(
						'3c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
						'hex',
					),
					bftWeight: BigInt(10),
				},
				{
					blsKey: Buffer.from(
						'4c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
						'hex',
					),
					bftWeight: BigInt(10),
				},
			],
			certificateThreshold: BigInt(10),
		};
		const terminatedStateAccount = {
			stateRoot: sidechainChainAccount.lastCertificate.stateRoot,
			mainchainStateRoot: EMPTY_BYTES,
			initialized: true,
		};
		const terminatedOutboxAccount = {
			outboxRoot: getRandomBytes(32),
			outboxSize: 1,
			partnerChainInboxSize: 1,
		};
		const registeredNameId = { id: Buffer.from('77', 'hex') };
		const registeredNetworkId = { id: Buffer.from('88', 'hex') };
		const validData = {
			outboxRootSubstore: [
				{ storeKey: Buffer.from([0, 0, 0, 1]), storeValue: outboxRoot },
				{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: outboxRoot },
			],
			chainDataSubstore: [
				{ storeKey: Buffer.from([0, 0, 0, 1]), storeValue: chainAccount },
				{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: chainAccount },
			],
			channelDataSubstore: [
				{ storeKey: Buffer.from([0, 0, 0, 1]), storeValue: channelData },
				{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: channelData },
			],
			chainValidatorsSubstore: [
				{ storeKey: Buffer.from([0, 0, 0, 1]), storeValue: validatorsHashInput },
				{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: validatorsHashInput },
			],
			ownChainDataSubstore: [
				{ storeKey: Buffer.from([0, 0, 0, 0]), storeValue: ownChainAccount },
				{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: ownChainAccount },
			],
			terminatedStateSubstore: [
				{ storeKey: Buffer.from([0, 0, 0, 1]), storeValue: terminatedStateAccount },
				{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: terminatedStateAccount },
			],
			terminatedOutboxSubstore: [
				{ storeKey: Buffer.from([0, 0, 0, 1]), storeValue: terminatedOutboxAccount },
				{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: terminatedOutboxAccount },
			],
			registeredNamesSubstore: [
				{ storeKey: Buffer.from([0, 0, 0, 0]), storeValue: registeredNameId },
				{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: registeredNameId },
			],
			registeredNetworkIDsSubstore: [
				{ storeKey: Buffer.from([0, 0, 0, 0]), storeValue: registeredNetworkId },
				{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: registeredNetworkId },
			],
		};

		const invalidData = {
			...validData,
			outboxRootSubstore: [
				{ storeKey: Buffer.from([0, 0, 0, 0]), storeValue: { root: getRandomBytes(37) } },
				{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: { root: getRandomBytes(5) } },
			],
		};

		let channelDataSubstore: any;
		let outboxRootSubstore: any;
		let terminatedOutboxSubstore: any;
		let stateStore: PrefixedStateReadWriter;
		let chainDataSubstore: any;
		let terminatedStateSubstore: any;
		let chainValidatorsSubstore: any;
		let ownChainDataSubstore: any;
		let registeredNamesSubstore: any;
		let registeredNetworkIDsSubstore: any;

		let mockGetStore: any;

		beforeEach(async () => {
			stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
			ownChainDataSubstore = stateStore.getStore(
				MODULE_ID_INTEROPERABILITY_BUFFER,
				STORE_PREFIX_OWN_CHAIN_DATA,
			);
			await ownChainDataSubstore.setWithSchema(
				MAINCHAIN_ID_BUFFER,
				ownChainAccount,
				ownChainAccountSchema,
			);
			channelDataSubstore = stateStore.getStore(
				MODULE_ID_INTEROPERABILITY_BUFFER,
				STORE_PREFIX_CHANNEL_DATA,
			);
			chainValidatorsSubstore = stateStore.getStore(
				MODULE_ID_INTEROPERABILITY_BUFFER,
				STORE_PREFIX_CHAIN_VALIDATORS,
			);
			outboxRootSubstore = stateStore.getStore(
				MODULE_ID_INTEROPERABILITY_BUFFER,
				STORE_PREFIX_OUTBOX_ROOT,
			);
			terminatedOutboxSubstore = stateStore.getStore(
				MODULE_ID_INTEROPERABILITY_BUFFER,
				STORE_PREFIX_TERMINATED_OUTBOX,
			);
			chainDataSubstore = stateStore.getStore(
				MODULE_ID_INTEROPERABILITY_BUFFER,
				STORE_PREFIX_CHAIN_DATA,
			);
			terminatedStateSubstore = stateStore.getStore(
				MODULE_ID_INTEROPERABILITY_BUFFER,
				STORE_PREFIX_TERMINATED_STATE,
			);
			registeredNamesSubstore = stateStore.getStore(
				MODULE_ID_INTEROPERABILITY_BUFFER,
				STORE_PREFIX_REGISTERED_NAMES,
			);
			registeredNetworkIDsSubstore = stateStore.getStore(
				MODULE_ID_INTEROPERABILITY_BUFFER,
				STORE_PREFIX_REGISTERED_NETWORK_IDS,
			);

			mockGetStore = jest.fn();
			when(mockGetStore)
				.calledWith(MODULE_ID_INTEROPERABILITY_BUFFER, STORE_PREFIX_CHANNEL_DATA)
				.mockReturnValue(channelDataSubstore);
			when(mockGetStore)
				.calledWith(MODULE_ID_INTEROPERABILITY_BUFFER, STORE_PREFIX_OUTBOX_ROOT)
				.mockReturnValue(outboxRootSubstore);
			when(mockGetStore)
				.calledWith(MODULE_ID_INTEROPERABILITY_BUFFER, STORE_PREFIX_TERMINATED_OUTBOX)
				.mockReturnValue(terminatedOutboxSubstore);
			when(mockGetStore)
				.calledWith(MODULE_ID_INTEROPERABILITY_BUFFER, STORE_PREFIX_CHAIN_DATA)
				.mockReturnValue(chainDataSubstore);
			when(mockGetStore)
				.calledWith(MODULE_ID_INTEROPERABILITY_BUFFER, STORE_PREFIX_TERMINATED_STATE)
				.mockReturnValue(terminatedStateSubstore);
			when(mockGetStore)
				.calledWith(MODULE_ID_INTEROPERABILITY_BUFFER, STORE_PREFIX_CHAIN_VALIDATORS)
				.mockReturnValue(chainValidatorsSubstore);
			when(mockGetStore)
				.calledWith(MODULE_ID_INTEROPERABILITY_BUFFER, STORE_PREFIX_OWN_CHAIN_DATA)
				.mockReturnValue(ownChainDataSubstore);
			when(mockGetStore)
				.calledWith(MODULE_ID_INTEROPERABILITY_BUFFER, STORE_PREFIX_REGISTERED_NAMES)
				.mockReturnValue(registeredNamesSubstore);
			when(mockGetStore)
				.calledWith(MODULE_ID_INTEROPERABILITY_BUFFER, STORE_PREFIX_REGISTERED_NETWORK_IDS)
				.mockReturnValue(registeredNetworkIDsSubstore);
		});

		it('should not throw error if asset does not exist', async () => {
			const context = createGenesisBlockContext({ stateStore }).createInitGenesisStateContext();
			jest.spyOn(context, 'getStore');

			await expect(initGenesisStateUtil(chainID, context)).toResolve();
			expect(context.getStore).not.toHaveBeenCalled();
		});

		it('should throw if the asset object is invalid', async () => {
			const encodedAsset = codec.encode(genesisInteroperabilityStoreSchema, invalidData);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([
					{ moduleID: MODULE_ID_INTEROPERABILITY_BUFFER, data: encodedAsset },
				]),
			}).createInitGenesisStateContext();

			await expect(initGenesisStateUtil(chainID, context)).rejects.toThrow();
		});

		it('should throw if outbox root store key is duplicated', async () => {
			const validData1 = {
				...validData,
				outboxRootSubstore: [
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: outboxRoot },
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: outboxRoot },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilityStoreSchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([
					{ moduleID: MODULE_ID_INTEROPERABILITY_BUFFER, data: encodedAsset },
				]),
			}).createInitGenesisStateContext();
			await expect(initGenesisStateUtil(chainID, context)).rejects.toThrow();
		});

		it('should throw if chain data store key is duplicated', async () => {
			const validData1 = {
				...validData,
				chainDataSubstore: [
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: chainAccount },
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: chainAccount },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilityStoreSchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([
					{ moduleID: MODULE_ID_INTEROPERABILITY_BUFFER, data: encodedAsset },
				]),
			}).createInitGenesisStateContext();
			await expect(initGenesisStateUtil(chainID, context)).rejects.toThrow();
		});

		it('should throw if channel data store key is duplicated', async () => {
			const validData1 = {
				...validData,
				channelDataSubstore: [
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: channelData },
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: channelData },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilityStoreSchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([
					{ moduleID: MODULE_ID_INTEROPERABILITY_BUFFER, data: encodedAsset },
				]),
			}).createInitGenesisStateContext();
			await expect(initGenesisStateUtil(chainID, context)).rejects.toThrow();
		});

		it('should throw if chain validators store key is duplicated', async () => {
			const validData1 = {
				...validData,
				chainValidatorsSubstore: [
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: validatorsHashInput },
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: validatorsHashInput },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilityStoreSchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([
					{ moduleID: MODULE_ID_INTEROPERABILITY_BUFFER, data: encodedAsset },
				]),
			}).createInitGenesisStateContext();
			await expect(initGenesisStateUtil(chainID, context)).rejects.toThrow();
		});

		it('should throw if own chain store key is duplicated', async () => {
			const validData1 = {
				...validData,
				ownChainDataSubstore: [
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: ownChainAccount },
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: ownChainAccount },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilityStoreSchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([
					{ moduleID: MODULE_ID_INTEROPERABILITY_BUFFER, data: encodedAsset },
				]),
			}).createInitGenesisStateContext();
			await expect(initGenesisStateUtil(chainID, context)).rejects.toThrow();
		});

		it('should throw if terminated state store key is duplicated', async () => {
			const validData1 = {
				...validData,
				terminatedStateSubstore: [
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: terminatedStateAccount },
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: terminatedStateAccount },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilityStoreSchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([
					{ moduleID: MODULE_ID_INTEROPERABILITY_BUFFER, data: encodedAsset },
				]),
			}).createInitGenesisStateContext();
			await expect(initGenesisStateUtil(chainID, context)).rejects.toThrow();
		});

		it('should throw if terminated outbox store key is duplicated', async () => {
			const validData1 = {
				...validData,
				terminatedOutboxSubstore: [
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: terminatedOutboxAccount },
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: terminatedOutboxAccount },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilityStoreSchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([
					{ moduleID: MODULE_ID_INTEROPERABILITY_BUFFER, data: encodedAsset },
				]),
			}).createInitGenesisStateContext();
			await expect(initGenesisStateUtil(chainID, context)).rejects.toThrow();
		});

		it('should throw if registered names store key is duplicated', async () => {
			const validData1 = {
				...validData,
				registeredNamesSubstore: [
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: registeredNameId },
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: registeredNameId },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilityStoreSchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([
					{ moduleID: MODULE_ID_INTEROPERABILITY_BUFFER, data: encodedAsset },
				]),
			}).createInitGenesisStateContext();
			await expect(initGenesisStateUtil(chainID, context)).rejects.toThrow();
		});

		it('should throw if registered network ids store key is duplicated', async () => {
			const validData1 = {
				...validData,
				registeredNetworkIDsSubstore: [
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: registeredNetworkId },
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: registeredNetworkId },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilityStoreSchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([
					{ moduleID: MODULE_ID_INTEROPERABILITY_BUFFER, data: encodedAsset },
				]),
			}).createInitGenesisStateContext();
			await expect(initGenesisStateUtil(chainID, context)).rejects.toThrow();
		});

		it('should throw if some store key in chain data substore is missing in outbox root substore and the corresponding chain account is not inactive', async () => {
			const validData1 = {
				...validData,
				outboxRootSubstore: [
					{ storeKey: Buffer.from([0, 0, 0, 0]), storeValue: outboxRoot },
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: outboxRoot },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilityStoreSchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([
					{ moduleID: MODULE_ID_INTEROPERABILITY_BUFFER, data: encodedAsset },
				]),
			}).createInitGenesisStateContext();
			await expect(initGenesisStateUtil(chainID, context)).rejects.toThrow();
		});

		it('should throw if some store key in chain data substore is present in outbox root substore but the corresponding chain account is inactive', async () => {
			const validData1 = {
				...validData,
				chainDataSubstore: [
					{ storeKey: Buffer.from([0, 0, 0, 1]), storeValue: { ...chainAccount, status: 2 } },
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: chainAccount },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilityStoreSchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([
					{ moduleID: MODULE_ID_INTEROPERABILITY_BUFFER, data: encodedAsset },
				]),
			}).createInitGenesisStateContext();
			await expect(initGenesisStateUtil(chainID, context)).rejects.toThrow();
		});

		it('should throw if some store key in chain data substore is missing in channel data substore', async () => {
			const validData1 = {
				...validData,
				channelDataSubstore: [
					{ storeKey: Buffer.from([0, 0, 0, 0]), storeValue: channelData },
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: channelData },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilityStoreSchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([
					{ moduleID: MODULE_ID_INTEROPERABILITY_BUFFER, data: encodedAsset },
				]),
			}).createInitGenesisStateContext();
			await expect(initGenesisStateUtil(chainID, context)).rejects.toThrow();
		});

		it('should throw if some store key in chain data substore is missing in chain validators substore', async () => {
			const validData1 = {
				...validData,
				chainValidatorsSubstore: [
					{ storeKey: Buffer.from([0, 0, 0, 0]), storeValue: validatorsHashInput },
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: validatorsHashInput },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilityStoreSchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([
					{ moduleID: MODULE_ID_INTEROPERABILITY_BUFFER, data: encodedAsset },
				]),
			}).createInitGenesisStateContext();
			await expect(initGenesisStateUtil(chainID, context)).rejects.toThrow();
		});

		it('should throw if some store key in outbox data substore is missing in chain data substore', async () => {
			const validData1 = {
				...validData,
				chainDataSubstore: [
					{ storeKey: Buffer.from([0, 0, 0, 1]), storeValue: chainAccount },
					{ storeKey: Buffer.from([0, 0, 1, 1]), storeValue: chainAccount },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilityStoreSchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([
					{ moduleID: MODULE_ID_INTEROPERABILITY_BUFFER, data: encodedAsset },
				]),
			}).createInitGenesisStateContext();
			await expect(initGenesisStateUtil(chainID, context)).rejects.toThrow();
		});

		it('should throw if some store key in channel data substore is missing in chain data substore', async () => {
			const validData1 = {
				...validData,
				chainDataSubstore: [
					{ storeKey: Buffer.from([0, 0, 0, 1]), storeValue: chainAccount },
					{ storeKey: Buffer.from([0, 0, 1, 1]), storeValue: chainAccount },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilityStoreSchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([
					{ moduleID: MODULE_ID_INTEROPERABILITY_BUFFER, data: encodedAsset },
				]),
			}).createInitGenesisStateContext();
			await expect(initGenesisStateUtil(chainID, context)).rejects.toThrow();
		});

		it('should throw if some store key in chain validators substore is missing in chain data substore', async () => {
			const validData1 = {
				...validData,
				chainDataSubstore: [
					{ storeKey: Buffer.from([0, 0, 0, 1]), storeValue: chainAccount },
					{ storeKey: Buffer.from([0, 0, 1, 1]), storeValue: chainAccount },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilityStoreSchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([
					{ moduleID: MODULE_ID_INTEROPERABILITY_BUFFER, data: encodedAsset },
				]),
			}).createInitGenesisStateContext();
			await expect(initGenesisStateUtil(chainID, context)).rejects.toThrow();
		});

		it('should throw if some store key in terminated outbox substore is missing in the terminated state substore', async () => {
			const validData1 = {
				...validData,
				terminatedStateSubstore: [
					{ storeKey: Buffer.from([0, 0, 0, 0]), storeValue: terminatedStateAccount },
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: terminatedStateAccount },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilityStoreSchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([
					{ moduleID: MODULE_ID_INTEROPERABILITY_BUFFER, data: encodedAsset },
				]),
			}).createInitGenesisStateContext();
			await expect(initGenesisStateUtil(chainID, context)).rejects.toThrow();
		});

		it('should throw if some store key in terminated state substore is present in the terminated outbox substore but the property initialized is set to false', async () => {
			const validData1 = {
				...validData,
				terminatedStateSubstore: [
					{
						storeKey: Buffer.from([0, 0, 0, 1]),
						storeValue: { ...terminatedStateAccount, initialized: false },
					},
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: terminatedStateAccount },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilityStoreSchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([
					{ moduleID: MODULE_ID_INTEROPERABILITY_BUFFER, data: encodedAsset },
				]),
			}).createInitGenesisStateContext();
			await expect(initGenesisStateUtil(chainID, context)).rejects.toThrow();
		});

		it('should throw if some store key in terminated state substore has the property initialized set to false but stateRoot is not set to empty bytes and mainchainStateRoot not set to a 32-bytes value', async () => {
			const validData1 = {
				...validData,
				terminatedStateSubstore: [
					{
						storeKey: Buffer.from([0, 0, 0, 0]),
						storeValue: { ...terminatedStateAccount, initialized: false },
					},
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: terminatedStateAccount },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilityStoreSchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([
					{ moduleID: MODULE_ID_INTEROPERABILITY_BUFFER, data: encodedAsset },
				]),
			}).createInitGenesisStateContext();
			await expect(initGenesisStateUtil(chainID, context)).rejects.toThrow();
		});

		it('should throw if some store key in terminated state substore has the property initialized set to true but mainchainStateRoot is not set to empty bytes and stateRoot not set to a 32-bytes value', async () => {
			const validData1 = {
				...validData,
				terminatedStateSubstore: [
					{
						storeKey: Buffer.from([0, 0, 0, 1]),
						storeValue: {
							...terminatedStateAccount,
							initialized: true,
							mainchainStateRoot: getRandomBytes(32),
							stateRoot: EMPTY_BYTES,
						},
					},
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: terminatedStateAccount },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilityStoreSchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([
					{ moduleID: MODULE_ID_INTEROPERABILITY_BUFFER, data: encodedAsset },
				]),
			}).createInitGenesisStateContext();
			await expect(initGenesisStateUtil(chainID, context)).rejects.toThrow();
		});

		it('should throw if active validators have less than 1 element', async () => {
			const validData1 = {
				...validData,
				chainValidatorsSubstore: [
					{
						storeKey: Buffer.from([0, 0, 0, 1]),
						storeValue: { ...validatorsHashInput, activeValidators: [] },
					},
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: validatorsHashInput },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilityStoreSchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([
					{ moduleID: MODULE_ID_INTEROPERABILITY_BUFFER, data: encodedAsset },
				]),
			}).createInitGenesisStateContext();
			await expect(initGenesisStateUtil(chainID, context)).rejects.toThrow();
		});

		it('should throw if active validators have more than MAX_NUM_VALIDATORS elements', async () => {
			const validData1 = {
				...validData,
				chainValidatorsSubstore: [
					{
						storeKey: Buffer.from([0, 0, 0, 1]),
						storeValue: {
							...validatorsHashInput,
							activeValidators: new Array(MAX_NUM_VALIDATORS + 1).fill(0),
						},
					},
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: validatorsHashInput },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilityStoreSchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([
					{ moduleID: MODULE_ID_INTEROPERABILITY_BUFFER, data: encodedAsset },
				]),
			}).createInitGenesisStateContext();
			await expect(initGenesisStateUtil(chainID, context)).rejects.toThrow();
		});

		it('should throw if active validators are not ordered lexicographically by blsKey', async () => {
			const validData1 = {
				...validData,
				chainValidatorsSubstore: [
					{
						storeKey: Buffer.from([0, 0, 0, 1]),
						storeValue: {
							...validatorsHashInput,
							activeValidators: [
								{
									blsKey: Buffer.from(
										'4c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
										'hex',
									),
									bftWeight: BigInt(10),
								},
								{
									blsKey: Buffer.from(
										'3c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
										'hex',
									),
									bftWeight: BigInt(10),
								},
							],
						},
					},
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: validatorsHashInput },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilityStoreSchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([
					{ moduleID: MODULE_ID_INTEROPERABILITY_BUFFER, data: encodedAsset },
				]),
			}).createInitGenesisStateContext();
			await expect(initGenesisStateUtil(chainID, context)).rejects.toThrow();
		});

		it('should throw if some active validators have blsKey which is not 48 bytes', async () => {
			const validData1 = {
				...validData,
				chainValidatorsSubstore: [
					{
						storeKey: Buffer.from([0, 0, 0, 1]),
						storeValue: {
							...validatorsHashInput,
							activeValidators: [
								{
									blsKey: getRandomBytes(21),
									bftWeight: BigInt(10),
								},
								{
									blsKey: Buffer.from(
										'3c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
										'hex',
									),
									bftWeight: BigInt(10),
								},
							],
						},
					},
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: validatorsHashInput },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilityStoreSchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([
					{ moduleID: MODULE_ID_INTEROPERABILITY_BUFFER, data: encodedAsset },
				]),
			}).createInitGenesisStateContext();
			await expect(initGenesisStateUtil(chainID, context)).rejects.toThrow();
		});

		it('should throw if some active validators have blsKey which is not pairwise distinct', async () => {
			const validData1 = {
				...validData,
				chainValidatorsSubstore: [
					{
						storeKey: Buffer.from([0, 0, 0, 1]),
						storeValue: {
							...validatorsHashInput,
							activeValidators: [
								{
									blsKey: Buffer.from(
										'3c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
										'hex',
									),
									bftWeight: BigInt(10),
								},
								{
									blsKey: Buffer.from(
										'3c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
										'hex',
									),
									bftWeight: BigInt(10),
								},
							],
						},
					},
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: validatorsHashInput },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilityStoreSchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([
					{ moduleID: MODULE_ID_INTEROPERABILITY_BUFFER, data: encodedAsset },
				]),
			}).createInitGenesisStateContext();
			await expect(initGenesisStateUtil(chainID, context)).rejects.toThrow();
		});

		it('should throw if some active validators have bftWeight which is not a positive integer', async () => {
			const validData1 = {
				...validData,
				chainValidatorsSubstore: [
					{
						storeKey: Buffer.from([0, 0, 0, 1]),
						storeValue: {
							...validatorsHashInput,
							activeValidators: [
								{
									blsKey: Buffer.from(
										'3c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
										'hex',
									),
									bftWeight: BigInt(-1),
								},
								{
									blsKey: Buffer.from(
										'4c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
										'hex',
									),
									bftWeight: BigInt(10),
								},
							],
						},
					},
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: validatorsHashInput },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilityStoreSchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([
					{ moduleID: MODULE_ID_INTEROPERABILITY_BUFFER, data: encodedAsset },
				]),
			}).createInitGenesisStateContext();
			await expect(initGenesisStateUtil(chainID, context)).rejects.toThrow();
		});

		it('should throw if total bft weight of active validators is greater than MAX_UINT64', async () => {
			const validData1 = {
				...validData,
				chainValidatorsSubstore: [
					{
						storeKey: Buffer.from([0, 0, 0, 1]),
						storeValue: {
							...validatorsHashInput,
							activeValidators: [
								{
									blsKey: Buffer.from(
										'3c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
										'hex',
									),
									bftWeight: BigInt(MAX_UINT64),
								},
								{
									blsKey: Buffer.from(
										'4c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
										'hex',
									),
									bftWeight: BigInt(10),
								},
							],
						},
					},
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: validatorsHashInput },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilityStoreSchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([
					{ moduleID: MODULE_ID_INTEROPERABILITY_BUFFER, data: encodedAsset },
				]),
			}).createInitGenesisStateContext();
			await expect(initGenesisStateUtil(chainID, context)).rejects.toThrow();
		});

		it('should throw if total bft weight of active validators is less than the value check', async () => {
			const validatorsHashInput1 = {
				...validatorsHashInput,
				activeValidators: [
					{
						blsKey: Buffer.from(
							'3c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
							'hex',
						),
						bftWeight: BigInt(0),
					},
				],
			};
			const validData1 = {
				...validData,
				chainValidatorsSubstore: [
					{ storeKey: Buffer.from([0, 0, 0, 1]), storeValue: validatorsHashInput1 },
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: validatorsHashInput1 },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilityStoreSchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([
					{ moduleID: MODULE_ID_INTEROPERABILITY_BUFFER, data: encodedAsset },
				]),
			}).createInitGenesisStateContext();
			await expect(initGenesisStateUtil(chainID, context)).rejects.toThrow();
		});

		it('should throw if certificateThreshold is less than the value check', async () => {
			const validData1 = {
				...validData,
				chainValidatorsSubstore: [
					{
						storeKey: Buffer.from([0, 0, 0, 1]),
						storeValue: { ...validatorsHashInput, certificateThreshold: BigInt(1) },
					},
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: validatorsHashInput },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilityStoreSchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([
					{ moduleID: MODULE_ID_INTEROPERABILITY_BUFFER, data: encodedAsset },
				]),
			}).createInitGenesisStateContext();
			await expect(initGenesisStateUtil(chainID, context)).rejects.toThrow();
		});

		it('should throw if a chain account for another sidechain is present but chain account for mainchain is not present', async () => {
			const validData1 = {
				...validData,
				chainDataSubstore: [
					{ storeKey: Buffer.from([0, 0, 0, 0]), storeValue: chainAccount },
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: chainAccount },
				],
				outboxRootSubstore: [
					{ storeKey: Buffer.from([0, 0, 0, 0]), storeValue: outboxRoot },
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: outboxRoot },
				],
				channelDataSubstore: [
					{ storeKey: Buffer.from([0, 0, 0, 0]), storeValue: channelData },
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: channelData },
				],
				chainValidatorsSubstore: [
					{ storeKey: Buffer.from([0, 0, 0, 0]), storeValue: validatorsHashInput },
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: validatorsHashInput },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilityStoreSchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([
					{ moduleID: MODULE_ID_INTEROPERABILITY_BUFFER, data: encodedAsset },
				]),
			}).createInitGenesisStateContext();
			await expect(initGenesisStateUtil(chainID, context)).rejects.toThrow();
		});

		it('should throw if a chain account for another sidechain is present but chain account for ownchain is not present', async () => {
			const validData1 = {
				...validData,
				chainDataSubstore: [
					{ storeKey: Buffer.from([0, 0, 0, 0]), storeValue: chainAccount },
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: chainAccount },
				],
				outboxRootSubstore: [
					{ storeKey: Buffer.from([0, 0, 0, 0]), storeValue: outboxRoot },
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: outboxRoot },
				],
				channelDataSubstore: [
					{ storeKey: Buffer.from([0, 0, 0, 0]), storeValue: channelData },
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: channelData },
				],
				chainValidatorsSubstore: [
					{ storeKey: Buffer.from([0, 0, 0, 0]), storeValue: validatorsHashInput },
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: validatorsHashInput },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilityStoreSchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([
					{ moduleID: MODULE_ID_INTEROPERABILITY_BUFFER, data: encodedAsset },
				]),
			}).createInitGenesisStateContext();
			await expect(initGenesisStateUtil(chainID, context)).rejects.toThrow();
		});

		it('should not throw if some chain id corresponding to message fee token id of a channel is not 1 but is corresponding native token id of either chains', async () => {
			const validData1 = {
				...validData,
				channelDataSubstore: [
					{ storeKey: Buffer.from([0, 0, 0, 1]), storeValue: channelData },
					{
						storeKey: Buffer.from([0, 0, 1, 0]),
						storeValue: {
							...channelData,
							messageFeeTokenID: {
								chainID: Buffer.from([0, 0, 1, 0]),
								localID: utils.intToBuffer(0, 4),
							},
						},
					},
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilityStoreSchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([
					{ moduleID: MODULE_ID_INTEROPERABILITY_BUFFER, data: encodedAsset },
				]),
			}).createInitGenesisStateContext();
			await expect(initGenesisStateUtil(chainID, context)).toResolve();
		});

		it('should throw if some chain id corresponding to message fee token id of a channel is neither 1 nor corresponding native token id of either chains', async () => {
			const validData1 = {
				...validData,
				channelDataSubstore: [
					{
						storeKey: Buffer.from([0, 0, 0, 1]),
						storeValue: {
							...channelData,
							messageFeeTokenID: {
								chainID: Buffer.from([0, 0, 2, 0]),
								localID: utils.intToBuffer(0, 4),
							},
						},
					},
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: channelData },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilityStoreSchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([
					{ moduleID: MODULE_ID_INTEROPERABILITY_BUFFER, data: encodedAsset },
				]),
			}).createInitGenesisStateContext();
			await expect(initGenesisStateUtil(chainID, context)).rejects.toThrow();
		});

		it('should throw if some chain id corresponding to message fee token id of a channel is 1 but corresponding local id is not 0', async () => {
			const validData1 = {
				...validData,
				channelDataSubstore: [
					{
						storeKey: Buffer.from([0, 0, 0, 1]),
						storeValue: {
							...channelData,
							messageFeeTokenID: {
								chainID: utils.intToBuffer(1, 4),
								localID: utils.intToBuffer(2, 4),
							},
						},
					},
					{ storeKey: Buffer.from([0, 0, 1, 0]), storeValue: channelData },
				],
			};
			const encodedAsset = codec.encode(genesisInteroperabilityStoreSchema, validData1);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([
					{ moduleID: MODULE_ID_INTEROPERABILITY_BUFFER, data: encodedAsset },
				]),
			}).createInitGenesisStateContext();
			await expect(initGenesisStateUtil(chainID, context)).rejects.toThrow();
		});

		it('should create all the corresponding entries in the interoperability module state for every substore for valid input', async () => {
			const encodedAsset = codec.encode(genesisInteroperabilityStoreSchema, validData);
			const context = createGenesisBlockContext({
				stateStore,
				assets: new BlockAssets([
					{ moduleID: MODULE_ID_INTEROPERABILITY_BUFFER, data: encodedAsset },
				]),
			}).createInitGenesisStateContext();

			await expect(initGenesisStateUtil(chainID, context)).toResolve();

			channelDataSubstore = stateStore.getStore(
				MODULE_ID_INTEROPERABILITY_BUFFER,
				STORE_PREFIX_CHANNEL_DATA,
			);
			chainValidatorsSubstore = stateStore.getStore(
				MODULE_ID_INTEROPERABILITY_BUFFER,
				STORE_PREFIX_CHAIN_VALIDATORS,
			);
			outboxRootSubstore = stateStore.getStore(
				MODULE_ID_INTEROPERABILITY_BUFFER,
				STORE_PREFIX_OUTBOX_ROOT,
			);
			terminatedOutboxSubstore = stateStore.getStore(
				MODULE_ID_INTEROPERABILITY_BUFFER,
				STORE_PREFIX_TERMINATED_OUTBOX,
			);
			chainDataSubstore = stateStore.getStore(
				MODULE_ID_INTEROPERABILITY_BUFFER,
				STORE_PREFIX_CHAIN_DATA,
			);
			terminatedStateSubstore = stateStore.getStore(
				MODULE_ID_INTEROPERABILITY_BUFFER,
				STORE_PREFIX_TERMINATED_STATE,
			);
			registeredNamesSubstore = stateStore.getStore(
				MODULE_ID_INTEROPERABILITY_BUFFER,
				STORE_PREFIX_REGISTERED_NAMES,
			);
			registeredNetworkIDsSubstore = stateStore.getStore(
				MODULE_ID_INTEROPERABILITY_BUFFER,
				STORE_PREFIX_REGISTERED_NETWORK_IDS,
			);
			ownChainDataSubstore = stateStore.getStore(
				MODULE_ID_INTEROPERABILITY_BUFFER,
				STORE_PREFIX_OWN_CHAIN_DATA,
			);

			for (const data of validData.chainDataSubstore) {
				await expect(chainDataSubstore.has(data.storeKey)).resolves.toBeTrue();
			}
			for (const data of validData.chainValidatorsSubstore) {
				await expect(chainValidatorsSubstore.has(data.storeKey)).resolves.toBeTrue();
			}
			for (const data of validData.outboxRootSubstore) {
				await expect(outboxRootSubstore.has(data.storeKey)).resolves.toBeTrue();
			}
			for (const data of validData.terminatedOutboxSubstore) {
				await expect(terminatedOutboxSubstore.has(data.storeKey)).resolves.toBeTrue();
			}
			for (const data of validData.channelDataSubstore) {
				await expect(channelDataSubstore.has(data.storeKey)).resolves.toBeTrue();
			}
			for (const data of validData.terminatedStateSubstore) {
				await expect(terminatedStateSubstore.has(data.storeKey)).resolves.toBeTrue();
			}
			for (const data of validData.registeredNamesSubstore) {
				await expect(registeredNamesSubstore.has(data.storeKey)).resolves.toBeTrue();
			}
			for (const data of validData.registeredNetworkIDsSubstore) {
				await expect(registeredNetworkIDsSubstore.has(data.storeKey)).resolves.toBeTrue();
			}
			for (const data of validData.ownChainDataSubstore) {
				await expect(ownChainDataSubstore.has(data.storeKey)).resolves.toBeTrue();
			}
		});
	});
});
