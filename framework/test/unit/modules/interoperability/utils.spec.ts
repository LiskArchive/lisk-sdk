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
import { SparseMerkleTree } from '@liskhq/lisk-db';
import { MainchainInteroperabilityModule, VerifyStatus } from '../../../../src';
import {
	CCMStatusCode,
	CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
	CROSS_CHAIN_COMMAND_NAME_SIDECHAIN_TERMINATED,
	EMPTY_BYTES,
	HASH_LENGTH,
	LIVENESS_LIMIT,
	MAX_CCM_SIZE,
	MODULE_NAME_INTEROPERABILITY,
} from '../../../../src/modules/interoperability/constants';
import { ccmSchema } from '../../../../src/modules/interoperability/schemas';
import {
	ChainAccount,
	ChannelData,
	CrossChainUpdateTransactionParams,
	InboxUpdate,
	CCMsg,
} from '../../../../src/modules/interoperability/types';
import {
	checkCertificateTimestamp,
	checkCertificateValidity,
	checkInboxUpdateValidity,
	checkLivenessRequirementFirstCCU,
	checkValidatorsHashWithCertificate,
	checkValidCertificateLiveness,
	commonCCUExecutelogic,
	computeValidatorsHash,
	validateFormat,
	verifyLivenessConditionForRegisteredChains,
} from '../../../../src/modules/interoperability/utils';
import { certificateSchema } from '../../../../src/engine/consensus/certificate_generation/schema';
import { Certificate } from '../../../../src/engine/consensus/certificate_generation/types';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import {
	ChainAccountStore,
	ChainStatus,
} from '../../../../src/modules/interoperability/stores/chain_account';
import { ChainValidatorsStore } from '../../../../src/modules/interoperability/stores/chain_validators';
import { ChannelDataStore } from '../../../../src/modules/interoperability/stores/channel_data';

jest.mock('@liskhq/lisk-cryptography', () => ({
	...jest.requireActual('@liskhq/lisk-cryptography'),
}));

describe('Utils', () => {
	const interopMod = new MainchainInteroperabilityModule();
	const defaultActiveValidatorsUpdate = [
		{ blsKey: cryptography.utils.getRandomBytes(48), bftWeight: BigInt(1) },
		{ blsKey: cryptography.utils.getRandomBytes(48), bftWeight: BigInt(3) },
		{ blsKey: cryptography.utils.getRandomBytes(48), bftWeight: BigInt(4) },
		{ blsKey: cryptography.utils.getRandomBytes(48), bftWeight: BigInt(3) },
	];

	describe('checkLivenessRequirementFirstCCU', () => {
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
			const result = checkLivenessRequirementFirstCCU(
				partnerChainAccount as ChainAccount,
				txParamsEmptyCertificate as CrossChainUpdateTransactionParams,
			);
			expect(result.status).toEqual(VerifyStatus.FAIL);
		});

		it(`should return status VerifyStatus.OK status when chain status ${ChainStatus.REGISTERED} && certificate is non-empty`, () => {
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
			expect(error?.message).toBe('Certificate is missing required values.');
		});

		it('should return VerifyStatus.FAIL when certificate height is less than or equal to last certificate height', () => {
			const { status, error } = checkCertificateValidity(
				partnerChainAccountWithHigherHeight as ChainAccount,
				encodedCertificate,
			);

			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toBe(
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

	describe('checkValidCertificateLiveness', () => {
		const inboxUpdate = {
			crossChainMessages: [Buffer.alloc(1)],
			messageWitnessHashes: [Buffer.alloc(1)],
			outboxRootWitness: {
				bitmap: Buffer.alloc(1),
				siblingHashes: [Buffer.alloc(1)],
			},
		} as InboxUpdate;
		const inboxUpdateEmpty = {
			crossChainMessages: [],
			messageWitnessHashes: [],
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
		activeValidatorsUpdate.sort((a, b) => a.blsKey.compare(b.blsKey));
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
			certificateThreshold: BigInt(10),
		};

		it('should return VerifyStatus.FAIL when certificate is empty', () => {
			const txParamsWithIncorrectHash = { ...txParams, certificate: EMPTY_BYTES };
			const { status, error } = checkValidatorsHashWithCertificate(
				txParamsWithIncorrectHash,
				partnerValidators,
			);

			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toBe(
				'Certificate cannot be empty when activeValidatorsUpdate or certificateThreshold has a non-empty value.',
			);
		});

		it('should return VerifyStatus.FAIL when certificate has missing fields', () => {
			const txParamsWithIncorrectHash = { ...txParams, certificate: Buffer.alloc(2) };
			const { status, error } = checkValidatorsHashWithCertificate(
				txParamsWithIncorrectHash,
				partnerValidators,
			);

			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toBe(
				'Certificate should have all required values when activeValidatorsUpdate or certificateThreshold has a non-empty value.',
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
			expect(error?.message).toBe('Validators hash given in the certificate is incorrect.');
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

		it('should return VerifyStatus.OK when activeValidatorsUpdate.length === 0 and certificateThreshold === 0', () => {
			const ineligibleTxParams = {
				...txParams,
				activeValidatorsUpdate: [],
				certificateThreshold: BigInt(0),
			};
			const { status, error } = checkValidatorsHashWithCertificate(
				ineligibleTxParams,
				partnerValidators,
			);

			expect(status).toEqual(VerifyStatus.OK);
			expect(error).toBeUndefined();
		});

		it('should return VerifyStatus.OK when certificateThreshold === 0 but activeValidatorsUpdate.length > 0', () => {
			const { status, error } = checkValidatorsHashWithCertificate(
				{ ...txParams, certificateThreshold: BigInt(0) },
				partnerValidators,
			);

			expect(status).toEqual(VerifyStatus.OK);
			expect(error).toBeUndefined();
		});

		it('should return VerifyStatus.OK when certificateThreshold > 0 but activeValidatorsUpdate.length === 0', () => {
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

		const partnerChainOutboxRoot = cryptography.utils.getRandomBytes(HASH_LENGTH);
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
			messageFeeTokenID: Buffer.from('0000000000000011', 'hex'),
			outbox: outboxTree,
			partnerChainOutboxRoot,
		};

		const defaultSendingChainID = utils.intToBuffer(20, 4);

		const defaultCCMs = [
			{
				crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
				fee: BigInt(0),
				module: MODULE_NAME_INTEROPERABILITY,
				nonce: BigInt(1),
				params: Buffer.alloc(2),
				receivingChainID: utils.intToBuffer(2, 4),
				sendingChainID: defaultSendingChainID,
				status: CCMStatusCode.OK,
			},
			{
				crossChainCommandID: utils.intToBuffer(2, 4),
				fee: BigInt(0),
				module: MODULE_NAME_INTEROPERABILITY,
				nonce: BigInt(1),
				params: Buffer.alloc(2),
				receivingChainID: utils.intToBuffer(3, 4),
				sendingChainID: defaultSendingChainID,
				status: CCMStatusCode.OK,
			},
		];

		const inboxUpdateCCMs = [
			{
				crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
				fee: BigInt(0),
				module: MODULE_NAME_INTEROPERABILITY,
				nonce: BigInt(2),
				params: Buffer.alloc(4),
				receivingChainID: utils.intToBuffer(90, 4),
				sendingChainID: defaultSendingChainID,
				status: CCMStatusCode.OK,
			},
			{
				crossChainCommandID: utils.intToBuffer(2, 4),
				fee: BigInt(0),
				module: MODULE_NAME_INTEROPERABILITY,
				nonce: BigInt(10),
				params: Buffer.alloc(4),
				receivingChainID: utils.intToBuffer(70, 4),
				sendingChainID: defaultSendingChainID,
				status: CCMStatusCode.OK,
			},
		];
		const defaultCCMsEncoded = defaultCCMs.map(ccm => codec.encode(ccmSchema, ccm));
		const inboxUpdateCCMsEncoded = inboxUpdateCCMs.map(ccm => codec.encode(ccmSchema, ccm));

		const inboxUpdateEmpty = {
			crossChainMessages: [],
			messageWitnessHashes: [],
			outboxRootWitness: {
				bitmap: Buffer.alloc(0),
				siblingHashes: [],
			},
		};
		const inboxUpdate = {
			crossChainMessages: inboxUpdateCCMsEncoded,
			messageWitnessHashes: [cryptography.utils.getRandomBytes(32)],
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
			certificateThreshold: BigInt(10),
			inboxUpdate,
			sendingChainID: utils.intToBuffer(2, 4),
		};

		let newInboxRoot: Buffer;
		let newInboxAppendPath: Buffer[] = [];
		let newInboxSize = 0;

		beforeEach(() => {
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

		it('should return VerifyStatus.OK when inboxUpdate is empty', async () => {
			const txParamsEmptyInboxUpdate = { ...txParams, inboxUpdate: inboxUpdateEmpty };
			const { status, error } = await checkInboxUpdateValidity(
				interopMod.stores,
				txParamsEmptyInboxUpdate,
				partnerChannelData,
			);
			expect(status).toEqual(VerifyStatus.OK);
			expect(error).toBeUndefined();
		});

		describe('Non-empty certificate and inboxUpdate', () => {
			it('should update inboxRoot when messageWitnessHashes is non-empty', async () => {
				const smtVerifySpy = jest
					.spyOn(SparseMerkleTree.prototype, 'verify')
					.mockResolvedValue({} as never);
				const { status, error } = await checkInboxUpdateValidity(
					interopMod.stores,
					txParams,
					partnerChannelData,
				);
				expect(status).toEqual(VerifyStatus.OK);
				expect(error).toBeUndefined();
				expect(smtVerifySpy).toHaveBeenCalled();
			});

			it('should not call calculateRootFromRightWitness when messageWitnessHashes is empty', async () => {
				const calculateRootFromRightWitnessSpy = jest.spyOn(
					merkleTree.regularMerkleTree,
					'calculateRootFromRightWitness',
				);
				const smtVerifySpy = jest
					.spyOn(SparseMerkleTree.prototype, 'verify')
					.mockResolvedValue(true);

				const inboxUpdateMessageWitnessEmpty = {
					crossChainMessages: inboxUpdateCCMsEncoded,
					messageWitnessHashes: [],
					outboxRootWitness: {
						bitmap: cryptography.utils.getRandomBytes(32),
						siblingHashes: [cryptography.utils.getRandomBytes(32)],
					},
				};

				const txParamsEmptyMessageWitness: CrossChainUpdateTransactionParams = {
					certificate: encodedCertificate,
					activeValidatorsUpdate,
					certificateThreshold: BigInt(10),
					inboxUpdate: inboxUpdateMessageWitnessEmpty,
					sendingChainID: utils.intToBuffer(2, 4),
				};
				const { status, error } = await checkInboxUpdateValidity(
					interopMod.stores,
					txParamsEmptyMessageWitness,
					partnerChannelData,
				);
				expect(status).toEqual(VerifyStatus.OK);
				expect(error).toBeUndefined();
				expect(calculateRootFromRightWitnessSpy).not.toHaveBeenCalled();
				expect(smtVerifySpy).toHaveBeenCalled();
			});

			it('should return VerifyStatus.FAIL if outboxWitness fails SMT.verify', async () => {
				const calculateRootFromRightWitnessSpy = jest
					.spyOn(merkleTree.regularMerkleTree, 'calculateRootFromRightWitness')
					.mockReturnValue({} as never);
				const smtVerifySpy = jest
					.spyOn(SparseMerkleTree.prototype, 'verify')
					.mockResolvedValue(false);

				const { status, error } = await checkInboxUpdateValidity(
					interopMod.stores,
					txParams,
					partnerChannelData,
				);
				expect(status).toEqual(VerifyStatus.FAIL);
				expect(error?.message).toBe(
					'Failed at verifying state root when messageWitnessHashes and certificate are non-empty.',
				);
				expect(calculateRootFromRightWitnessSpy).toHaveBeenCalled();
				expect(smtVerifySpy).toHaveBeenCalled();
			});

			it('should return VerifyStatus.OK on SMT.verify true for non-empty certificate and inboxUpdate', async () => {
				const calculateRootFromRightWitnessSpy = jest
					.spyOn(merkleTree.regularMerkleTree, 'calculateRootFromRightWitness')
					.mockReturnValue({} as never);
				const smtVerifySpy = jest
					.spyOn(SparseMerkleTree.prototype, 'verify')
					.mockResolvedValue(true);

				const { status, error } = await checkInboxUpdateValidity(
					interopMod.stores,
					txParams,
					partnerChannelData,
				);
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

			it('should update newInboxRoot when messageWitnessHashes is non-empty', async () => {
				const calculateRootFromRightWitnessSpy = jest
					.spyOn(merkleTree.regularMerkleTree, 'calculateRootFromRightWitness')
					.mockReturnValue(partnerChannelData.partnerChainOutboxRoot);

				const { status, error } = await checkInboxUpdateValidity(
					interopMod.stores,
					txParamsWithEmptyCertificate,
					partnerChannelData,
				);
				expect(status).toEqual(VerifyStatus.OK);
				expect(error).toBeUndefined();
				expect(calculateRootFromRightWitnessSpy).toHaveBeenCalled();
			});

			it('should not call calculateRootFromRightWitness when messageWitnessHashes is empty', async () => {
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
						messageWitnessHashes: [],
					},
				};
				const calculateRootFromRightWitnessSpy = jest.spyOn(
					merkleTree.regularMerkleTree,
					'calculateRootFromRightWitness',
				);
				const calculateMerkleRootSpy = jest
					.spyOn(merkleTree.regularMerkleTree, 'calculateMerkleRoot')
					.mockReturnValue({ root: partnerChannelData.partnerChainOutboxRoot } as never);

				const { status, error } = await checkInboxUpdateValidity(
					interopMod.stores,
					txParamsEmptyMessageWitness,
					partnerChannelData,
				);
				expect(status).toEqual(VerifyStatus.OK);
				expect(error).toBeUndefined();
				expect(calculateMerkleRootSpy).toHaveBeenCalledTimes(inboxUpdateCCMsEncoded.length);
				expect(calculateRootFromRightWitnessSpy).not.toHaveBeenCalled();
			});

			it('should return VerifyStatus.FAIL when calculated newInboxRoot is not equal to partnerChainOutboxRoot', async () => {
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
						messageWitnessHashes: [],
					},
				};
				const calculateRootFromRightWitnessSpy = jest.spyOn(
					merkleTree.regularMerkleTree,
					'calculateRootFromRightWitness',
				);
				const calculateMerkleRootSpy = jest
					.spyOn(merkleTree.regularMerkleTree, 'calculateMerkleRoot')
					.mockReturnValue({ root: cryptography.utils.getRandomBytes(32) } as never);

				const { status, error } = await checkInboxUpdateValidity(
					interopMod.stores,
					txParamsEmptyMessageWitness,
					partnerChannelData,
				);
				expect(status).toEqual(VerifyStatus.FAIL);
				expect(error?.message).toBe(
					'Failed at verifying state root when messageWitnessHashes is non-empty and certificate is empty.',
				);
				expect(calculateMerkleRootSpy).toHaveBeenCalledTimes(inboxUpdateCCMsEncoded.length);
				expect(calculateRootFromRightWitnessSpy).not.toHaveBeenCalled();
			});
		});
	});

	describe('commonCCUExecutelogic', () => {
		const chainIDBuffer = Buffer.from([0, 0, 0, 1]);
		const defaultCalculatedRootFromRightWitness = cryptography.utils.getRandomBytes(20);
		let activeValidatorsUpdate: any;
		let inboxUpdate: InboxUpdate;
		let certificate: any;
		let partnerChainAccount: any;
		let partnerValidatorStore: ChainValidatorsStore;
		let partnerChainStore: ChainAccountStore;
		let partnerValidators: any;
		let params: any;
		let partnerChannelStoreMock: ChannelDataStore;
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
				messageWitnessHashes: [Buffer.alloc(1)],
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
			partnerValidatorStore = interopMod.stores.get(ChainValidatorsStore);
			partnerChainStore = interopMod.stores.get(ChainAccountStore);
			partnerValidators = {
				activeValidators: activeValidatorsUpdate,
				certificateThreshold: BigInt(12),
			};
			params = {
				activeValidatorsUpdate,
				certificateThreshold: BigInt(10),
				certificate: Buffer.alloc(2),
				inboxUpdate,
			};
			partnerChannelStoreMock = interopMod.stores.get(ChannelDataStore);

			partnerChannelData = {
				partnerChainOutboxRoot: Buffer.alloc(HASH_LENGTH),
				inbox: {
					size: 2,
					appendPath: [Buffer.alloc(1)],
					root: cryptography.utils.getRandomBytes(20),
				},
				outbox: {
					size: 0,
					appendPath: [],
					root: Buffer.alloc(HASH_LENGTH),
				},
				messageFeeTokenID: Buffer.from('0000000000000011', 'hex'),
			};
			const stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
			context = {
				getStore: (modulePrefix: Buffer, storePrefix: Buffer) =>
					stateStore.getStore(modulePrefix, storePrefix),
				params,
				transaction: {
					module: MODULE_NAME_INTEROPERABILITY,
				},
			};

			await partnerChannelStoreMock.set(context, chainIDBuffer, partnerChannelData);
			calculateRootFromRightWitness = jest
				.spyOn(merkleTree.regularMerkleTree, 'calculateRootFromRightWitness')
				.mockReturnValue(defaultCalculatedRootFromRightWitness);

			jest.spyOn(partnerChainStore, 'set');
			jest.spyOn(partnerValidatorStore, 'set');
			jest.spyOn(partnerChannelStoreMock, 'get');
			jest.spyOn(partnerChannelStoreMock, 'set');
		});

		it('should run successfully and return undefined when certificateThreshold is non-zero', async () => {
			await expect(
				commonCCUExecutelogic({
					stores: interopMod.stores,
					certificate,
					partnerChainAccount,
					partnerValidatorStore,
					partnerChainStore,
					partnerValidators,
					chainIDBuffer,
					context,
				}),
			).resolves.toBeUndefined();
			expect(partnerValidatorStore.set).toHaveBeenCalledTimes(1);
			expect(partnerChainStore.set).toHaveBeenCalledTimes(1);
			expect(partnerChannelStoreMock.get).toHaveBeenCalledTimes(1);
			expect(partnerChannelStoreMock.set).toHaveBeenCalledTimes(1);
			expect(partnerValidators.certificateThreshold).toEqual(params.certificateThreshold);

			const updatedPartnerChannelData = await partnerChannelStoreMock.get(context, chainIDBuffer);

			expect(updatedPartnerChannelData.partnerChainOutboxRoot).toEqual(
				defaultCalculatedRootFromRightWitness,
			);
		});

		it('should run successfully and return undefined when certificateThreshold is zero', async () => {
			const paramsWithThresholdZero = {
				activeValidatorsUpdate,
				certificateThreshold: BigInt(0),
				certificate: Buffer.alloc(2),
				inboxUpdate,
			};
			const contextWithThresholdZero: any = { ...context, params: paramsWithThresholdZero };

			await expect(
				commonCCUExecutelogic({
					stores: interopMod.stores,
					certificate,
					partnerChainAccount,
					partnerValidatorStore,
					partnerChainStore,
					partnerValidators,
					chainIDBuffer,
					context: contextWithThresholdZero,
				}),
			).resolves.toBeUndefined();
			expect(partnerValidatorStore.set).toHaveBeenCalledTimes(1);
			expect(partnerChainStore.set).toHaveBeenCalledTimes(1);
			expect(partnerChannelStoreMock.get).toHaveBeenCalledTimes(1);
			expect(partnerChannelStoreMock.set).toHaveBeenCalledTimes(1);
			expect(partnerValidators.certificateThreshold).toEqual(BigInt(12)); // original partnerValidator value unchanged

			const updatedPartnerChannelData = await partnerChannelStoreMock.get(context, chainIDBuffer);

			expect(updatedPartnerChannelData.partnerChainOutboxRoot).toEqual(
				defaultCalculatedRootFromRightWitness,
			);
		});

		it('should run successfully and return undefined when certificate is empty', async () => {
			const paramsWithEmptyCertificate = {
				activeValidatorsUpdate,
				certificateThreshold: params.certificateThreshold,
				certificate: EMPTY_BYTES,
				inboxUpdate,
			};
			const contextWithEmptyCertificate: any = { ...context, params: paramsWithEmptyCertificate };

			await expect(
				commonCCUExecutelogic({
					stores: interopMod.stores,
					certificate: {} as any,
					partnerChainAccount,
					partnerValidatorStore,
					partnerChainStore,
					partnerValidators,
					chainIDBuffer,
					context: contextWithEmptyCertificate,
				}),
			).resolves.toBeUndefined();
			expect(partnerValidatorStore.set).toHaveBeenCalledTimes(1);
			expect(partnerChainStore.set).not.toHaveBeenCalled();
			expect(partnerChannelStoreMock.get).toHaveBeenCalledTimes(1);
			expect(partnerChannelStoreMock.set).toHaveBeenCalledTimes(1);
			expect(partnerChainAccount.lastCertificate.height).toBe(5); // original partnerValidator value unchange

			const updatedPartnerChannelData = await partnerChannelStoreMock.get(context, chainIDBuffer);

			expect(updatedPartnerChannelData.partnerChainOutboxRoot).toEqual(
				defaultCalculatedRootFromRightWitness,
			);
			expect(calculateRootFromRightWitness).toHaveBeenCalled();
		});

		it('should run successfully and return undefined when messageWitnessHashes is empty', async () => {
			const paramsWithEmptyMessageWitness = {
				activeValidatorsUpdate,
				certificateThreshold: params.certificateThreshold,
				certificate: params.certificate,
				inboxUpdate: {
					...inboxUpdate,
					messageWitnessHashes: [],
				},
			};
			const contextWithEmptyMessageWitness: any = {
				...context,
				params: paramsWithEmptyMessageWitness,
			};

			await expect(
				commonCCUExecutelogic({
					stores: interopMod.stores,
					certificate,
					partnerChainAccount,
					partnerValidatorStore,
					partnerChainStore,
					partnerValidators,
					chainIDBuffer,
					context: contextWithEmptyMessageWitness,
				}),
			).resolves.toBeUndefined();
			expect(partnerValidatorStore.set).toHaveBeenCalledTimes(1);
			expect(partnerChainStore.set).toHaveBeenCalledTimes(1);
			expect(partnerChannelStoreMock.get).toHaveBeenCalledTimes(1);
			expect(partnerChannelStoreMock.set).toHaveBeenCalledTimes(1);
			expect(partnerChainAccount.lastCertificate.height).toEqual(certificate.height);

			const updatedPartnerChannelData = await partnerChannelStoreMock.get(context, chainIDBuffer);

			expect(updatedPartnerChannelData.partnerChainOutboxRoot).toEqual(
				partnerChannelData.inbox.root,
			);
			expect(calculateRootFromRightWitness).not.toHaveBeenCalled();
		});
	});

	describe('validateFormat', () => {
		const buildCCM = (obj: Partial<CCMsg>) => ({
			crossChainCommand: obj.crossChainCommand ?? CROSS_CHAIN_COMMAND_NAME_SIDECHAIN_TERMINATED,
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
			blockID: utils.getRandomBytes(20),
			height: 23,
			stateRoot: Buffer.alloc(2),
			timestamp: 100000,
			validatorsHash: utils.getRandomBytes(20),
			aggregationBits: utils.getRandomBytes(1),
			signature: utils.getRandomBytes(32),
		};
		const ccuParams = {
			activeValidatorsUpdate: [],
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

		it('should not throw if certificate is empty', () => {
			expect(
				verifyLivenessConditionForRegisteredChains(
					{
						...ccuParams,
						certificate: Buffer.alloc(0),
					},
					10000,
				),
			).toBeUndefined();
		});

		it('should not throw if inbox update is empty', () => {
			expect(
				verifyLivenessConditionForRegisteredChains(
					{
						...ccuParams,
						inboxUpdate: {
							crossChainMessages: [],
							messageWitnessHashes: [],
							outboxRootWitness: {
								bitmap: Buffer.alloc(0),
								siblingHashes: [],
							},
						},
					},
					10000,
				),
			).toBeUndefined();
		});

		it('should throw if certificate timestamp is older than half of liveness limit', () => {
			expect(() =>
				verifyLivenessConditionForRegisteredChains(
					{
						...ccuParams,
					},
					certificate.timestamp + LIVENESS_LIMIT / 2 + 1,
				),
			).toThrow('The first CCU with a non-empty inbox update cannot contain a certificate older');
		});

		it('should not throw if inbox update is not older than half of liveness limit', () => {
			expect(
				verifyLivenessConditionForRegisteredChains(
					{
						...ccuParams,
					},
					certificate.timestamp + LIVENESS_LIMIT / 2,
				),
			).toBeUndefined();
		});
	});
});
