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

import { codec } from '@liskhq/lisk-codec';
import * as cryptography from '@liskhq/lisk-cryptography';
import * as merkleTree from '@liskhq/lisk-tree';
import { when } from 'jest-when';
import { VerifyStatus } from '../../../../src';
import {
	CCM_STATUS_OK,
	CHAIN_REGISTERED,
	EMPTY_BYTES,
	LIVENESS_LIMIT,
	STORE_PREFIX_CHANNEL_DATA,
} from '../../../../src/modules/interoperability/constants';
import { ccmSchema, channelSchema } from '../../../../src/modules/interoperability/schema';
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
	updateActiveValidators,
	verifyCertificateSignature,
} from '../../../../src/modules/interoperability/utils';
import { certificateSchema } from '../../../../src/engine/consensus/certificate_generation/schema';
import { Certificate } from '../../../../src/engine/consensus/certificate_generation/types';

jest.mock('@liskhq/lisk-cryptography', () => ({
	...jest.requireActual('@liskhq/lisk-cryptography'),
}));

describe('Utils', () => {
	const defaultActiveValidatorsUpdate = [
		{ blsKey: cryptography.getRandomBytes(48), bftWeight: BigInt(1) },
		{ blsKey: cryptography.getRandomBytes(48), bftWeight: BigInt(3) },
		{ blsKey: cryptography.getRandomBytes(48), bftWeight: BigInt(4) },
		{ blsKey: cryptography.getRandomBytes(48), bftWeight: BigInt(3) },
	];

	describe('updateActiveValidators', () => {
		const validator1 = {
			blsKey: cryptography.getRandomBytes(48),
			bftWeight: BigInt(1),
		};
		const validator2 = {
			blsKey: cryptography.getRandomBytes(48),
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
				{ blsKey: cryptography.getRandomBytes(48), bftWeight: BigInt(1) },
			];

			// Should be in lexicographical order
			activeValidatorsUpdate.sort((v1, v2) => v1.blsKey.compare(v2.blsKey));

			expect(updateActiveValidators(activeValidators, activeValidatorsUpdate)).toEqual(
				activeValidatorsUpdate,
			);
		});

		it('should remove a validator when its bftWeight=0', () => {
			const activeValidatorsLocal = [...activeValidators];
			const validator3 = { blsKey: cryptography.getRandomBytes(48), bftWeight: BigInt(3) };
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
		};

		const txParamsNonEmptyCertificate = {
			certificate: cryptography.getRandomBytes(32),
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
			blockID: cryptography.getRandomBytes(20),
			height: 23,
			stateRoot: Buffer.alloc(2),
			timestamp: Date.now(),
			validatorsHash: cryptography.getRandomBytes(20),
		};

		const certificateWithEmptyValues = {
			blockID: cryptography.getRandomBytes(20),
			height: 23,
			stateRoot: EMPTY_BYTES,
			timestamp: Date.now(),
			validatorsHash: EMPTY_BYTES,
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
			sendingChainID: 2,
			inboxUpdate: {},
		};

		const txParamsWithEmptyCertificate = {
			activeValidatorsUpdate,
			newCertificateThreshold: BigInt(10),
			certificate: EMPTY_BYTES,
			sendingChainID: 2,
			inboxUpdate: {},
		};

		const txParamsSortedValidators = {
			activeValidatorsUpdate: sortedValidatorsList,
			newCertificateThreshold: BigInt(10),
			certificate: Buffer.alloc(2),
			sendingChainID: 2,
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
			blockID: cryptography.getRandomBytes(20),
			height: 21,
			timestamp: Math.floor(Date.now() / 1000),
			stateRoot: cryptography.getRandomBytes(38),
			validatorsHash: cryptography.getRandomBytes(48),
			aggregationBits: cryptography.getRandomBytes(38),
			signature: cryptography.getRandomBytes(32),
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
		const partnerChainAccount: any = { networkID: cryptography.getRandomBytes(32) };

		it('should return VerifyStatus.OK if certificate is empty', () => {
			jest.spyOn(cryptography, 'verifyWeightedAggSig').mockReturnValue(true);
			const { status, error } = verifyCertificateSignature(
				txParamsWithEmptyCertificate,
				partnerValidators,
				partnerChainAccount,
			);

			expect(status).toEqual(VerifyStatus.OK);
			expect(error?.message).toBeUndefined();
			expect(cryptography.verifyWeightedAggSig).not.toHaveBeenCalled();
		});

		it('should return VerifyStatus.FAIL when certificate signature verification fails', () => {
			jest.spyOn(cryptography, 'verifyWeightedAggSig').mockReturnValue(false);
			const { status, error } = verifyCertificateSignature(
				txParams,
				partnerValidators,
				partnerChainAccount,
			);

			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toEqual('Certificate is invalid due to invalid signature.');
			expect(cryptography.verifyWeightedAggSig).toHaveBeenCalledTimes(1);
		});

		it('should return VerifyStatus.OK when certificate signature verification passes', () => {
			jest.spyOn(cryptography, 'verifyWeightedAggSig').mockReturnValue(true);

			const { status, error } = verifyCertificateSignature(
				txParams,
				partnerValidators,
				partnerChainAccount,
			);

			expect(status).toEqual(VerifyStatus.OK);
			expect(error).toBeUndefined();
			expect(cryptography.verifyWeightedAggSig).toHaveBeenCalledTimes(1);
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
			blockID: cryptography.getRandomBytes(20),
			height: 20,
			stateRoot: cryptography.getRandomBytes(32),
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
				validatorsHash: cryptography.getRandomBytes(48),
				blockID: cryptography.getRandomBytes(20),
				height: 20,
				stateRoot: cryptography.getRandomBytes(32),
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

		const partnerChainOutboxRoot = cryptography.getRandomBytes(32);
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
				chainID: 1,
				localID: 0,
			},
			outbox: outboxTree,
			partnerChainOutboxRoot,
		};

		const defaultSendingChainID = 20;

		const defaultCCMs = [
			{
				crossChainCommandID: 1,
				fee: BigInt(0),
				moduleID: 1,
				nonce: BigInt(1),
				params: Buffer.alloc(2),
				receivingChainID: 2,
				sendingChainID: defaultSendingChainID,
				status: CCM_STATUS_OK,
			},
			{
				crossChainCommandID: 2,
				fee: BigInt(0),
				moduleID: 1,
				nonce: BigInt(1),
				params: Buffer.alloc(2),
				receivingChainID: 3,
				sendingChainID: defaultSendingChainID,
				status: CCM_STATUS_OK,
			},
		];

		const inboxUpdateCCMs = [
			{
				crossChainCommandID: 1,
				fee: BigInt(0),
				moduleID: 1,
				nonce: BigInt(2),
				params: Buffer.alloc(4),
				receivingChainID: 90,
				sendingChainID: defaultSendingChainID,
				status: CCM_STATUS_OK,
			},
			{
				crossChainCommandID: 2,
				fee: BigInt(0),
				moduleID: 1,
				nonce: BigInt(10),
				params: Buffer.alloc(4),
				receivingChainID: 70,
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
				siblingHashes: [cryptography.getRandomBytes(32)],
			},
			outboxRootWitness: {
				bitmap: cryptography.getRandomBytes(32),
				siblingHashes: [cryptography.getRandomBytes(32)],
			},
		};
		const certificate: Certificate = {
			blockID: cryptography.getRandomBytes(20),
			height: 20,
			stateRoot: cryptography.getRandomBytes(32),
			timestamp: Math.floor(Date.now() / 1000),
			validatorsHash: cryptography.getRandomBytes(48),
		};

		const encodedCertificate = codec.encode(certificateSchema, certificate);
		const txParams: CrossChainUpdateTransactionParams = {
			certificate: encodedCertificate,
			activeValidatorsUpdate,
			newCertificateThreshold: BigInt(10),
			inboxUpdate,
			sendingChainID: 20,
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
						bitmap: cryptography.getRandomBytes(32),
						siblingHashes: [cryptography.getRandomBytes(32)],
					},
				};

				const txParamsEmptyMessageWitness: CrossChainUpdateTransactionParams = {
					certificate: encodedCertificate,
					activeValidatorsUpdate,
					newCertificateThreshold: BigInt(10),
					inboxUpdate: inboxUpdateMessageWitnessEmpty,
					sendingChainID: 20,
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
				certificate: Buffer.alloc(0),
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
					certificate: Buffer.alloc(0),
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
					certificate: Buffer.alloc(0),
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
					.mockReturnValue({ root: cryptography.getRandomBytes(32) } as never);

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
		const defaultCalculatedRootFromRightWitness = cryptography.getRandomBytes(20);
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
				{ blsKey: cryptography.getRandomBytes(48), bftWeight: BigInt(1) },
				{ blsKey: cryptography.getRandomBytes(48), bftWeight: BigInt(3) },
				{ blsKey: cryptography.getRandomBytes(48), bftWeight: BigInt(4) },
				{ blsKey: cryptography.getRandomBytes(48), bftWeight: BigInt(3) },
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
					root: cryptography.getRandomBytes(20),
				},
			};
			context = {
				getStore: jest.fn(),
				params,
				transaction: {
					moduleID: 1,
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
});
