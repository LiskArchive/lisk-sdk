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
	CHAIN_REGISTERED,
	EMPTY_BYTES,
	LIVENESS_LIMIT,
	STORE_PREFIX_CHANNEL_DATA,
	VALID_BLS_KEY_LENGTH,
} from '../../../../src/modules/interoperability/constants';
import { channelSchema } from '../../../../src/modules/interoperability/schema';
import {
	ChainAccount,
	CrossChainUpdateTransactionParams,
	InboxUpdate,
} from '../../../../src/modules/interoperability/types';
import {
	checkActiveValidatorsUpdate,
	checkCertificateTimestampAndSignature,
	checkCertificateValidity,
	checkLivenessRequirementFirstCCU,
	checkValidatorsHashWithCertificate,
	checkValidCertificateLiveness,
	commonCCUExecutelogic,
	computeValidatorsHash,
	getIDAsKeyForStore,
	updateActiveValidators,
} from '../../../../src/modules/interoperability/utils';
import { certificateSchema } from '../../../../src/node/consensus/certificate_generation/schema';

jest.mock('@liskhq/lisk-cryptography', () => ({
	...jest.requireActual('@liskhq/lisk-cryptography'),
}));

jest.mock('@liskhq/lisk-tree', () => ({
	...jest.requireActual('@liskhq/lisk-tree'),
}));

describe('Utils', () => {
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
		const activeValidatorsUpdate = [
			{ blsKey: cryptography.getRandomBytes(48), bftWeight: BigInt(1) },
			{ blsKey: cryptography.getRandomBytes(48), bftWeight: BigInt(3) },
			{ blsKey: cryptography.getRandomBytes(48), bftWeight: BigInt(4) },
			{ blsKey: cryptography.getRandomBytes(48), bftWeight: BigInt(3) },
		];
		const sortedValidatorsList = [...activeValidatorsUpdate].sort((v1, v2) =>
			v1.blsKey.compare(v2.blsKey),
		);
		const activeValidatorsUpdateWithInvalidKeyLength = [
			{ blsKey: cryptography.getRandomBytes(16), bftWeight: BigInt(1) },
			{ blsKey: cryptography.getRandomBytes(48), bftWeight: BigInt(3) },
			{ blsKey: cryptography.getRandomBytes(48), bftWeight: BigInt(4) },
			{ blsKey: cryptography.getRandomBytes(48), bftWeight: BigInt(3) },
		];

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

		const txParamsWithInvalidActiveValidatorsKeyLength = {
			activeValidatorsUpdate: activeValidatorsUpdateWithInvalidKeyLength,
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
				'Certificate cannot be empty when activeValidatorsUpdate is non-empty or newCertificateThreshold >0.',
			);
		});

		it('should return VerifyStatus.FAIL for invalid key validator blsKey', () => {
			const { status, error } = checkActiveValidatorsUpdate(
				txParamsWithInvalidActiveValidatorsKeyLength as CrossChainUpdateTransactionParams,
			);

			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toEqual(`BlsKey length should be equal to ${VALID_BLS_KEY_LENGTH}.`);
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

	describe('checkCertificateTimestampAndSignature', () => {
		const timestamp = Date.now();
		const activeValidatorsUpdate: any = [
			{ blsKey: cryptography.getRandomBytes(48), bftWeight: BigInt(1) },
			{ blsKey: cryptography.getRandomBytes(48), bftWeight: BigInt(3) },
			{ blsKey: cryptography.getRandomBytes(48), bftWeight: BigInt(4) },
			{ blsKey: cryptography.getRandomBytes(48), bftWeight: BigInt(3) },
		];
		const txParams: any = {
			certificate: Buffer.alloc(2),
		};
		const txParamsWithEmptyCertificate: any = {
			certificate: Buffer.alloc(0),
		};
		const partnerValidators: any = {
			activeValidators: activeValidatorsUpdate,
			certificateThreshold: 10,
		};
		const partnerChainAccount: any = { networkID: cryptography.getRandomBytes(32) };
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
				checkCertificateTimestampAndSignature(
					txParamsWithEmptyCertificate,
					partnerValidators,
					partnerChainAccount,
					certificate,
					header,
				),
			).toBeUndefined();
		});

		it('should throw error when certificate signature verification fails', () => {
			jest.spyOn(cryptography, 'verifyWeightedAggSig').mockReturnValue(false);

			expect(() =>
				checkCertificateTimestampAndSignature(
					txParams,
					partnerValidators,
					partnerChainAccount,
					certificate,
					header,
				),
			).toThrow(
				'Certificate is invalid due to invalid last certified height or timestamp or signature.',
			);
			expect(cryptography.verifyWeightedAggSig).toHaveBeenCalledTimes(1);
		});

		it('should throw error when certificate.timestamp is greater than header.timestamp', () => {
			jest.spyOn(cryptography, 'verifyWeightedAggSig').mockReturnValue(true);

			expect(() =>
				checkCertificateTimestampAndSignature(
					txParams,
					partnerValidators,
					partnerChainAccount,
					certificateWithHigherTimestamp,
					header,
				),
			).toThrow(
				'Certificate is invalid due to invalid last certified height or timestamp or signature.',
			);
			expect(cryptography.verifyWeightedAggSig).toHaveBeenCalledTimes(1);
		});
	});

	describe('checkValidatorsHashWithCertificate', () => {
		const activeValidatorsUpdate = [
			{ blsKey: cryptography.getRandomBytes(48), bftWeight: BigInt(1) },
			{ blsKey: cryptography.getRandomBytes(48), bftWeight: BigInt(3) },
			{ blsKey: cryptography.getRandomBytes(48), bftWeight: BigInt(4) },
			{ blsKey: cryptography.getRandomBytes(48), bftWeight: BigInt(3) },
		];

		const txParams: any = {
			certificate: Buffer.alloc(2),
			activeValidatorsUpdate,
			newCertificateThreshold: BigInt(10),
		};

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

		const certificate: any = {
			aggregationBits: Buffer.alloc(2),
			signature: Buffer.alloc(2),
			validatorsHash,
		};

		it('should throw error when validators hash is incorrect', () => {
			expect(() =>
				checkValidatorsHashWithCertificate(
					txParams,
					{ ...certificate, validatorsHash: cryptography.getRandomBytes(32) },
					partnerValidators,
				),
			).toThrow('Validators hash is incorrect given in the certificate.');
		});

		it('should return undefined when validators hash is correct', () => {
			expect(
				checkValidatorsHashWithCertificate(
					{ ...txParams, newCertificateThreshold: BigInt(0) },
					certificate,
					partnerValidators,
				),
			).toBeUndefined();
		});

		it('should return undefined when activeValidatorsUpdate is of zero length', () => {
			expect(
				checkValidatorsHashWithCertificate(
					{ ...txParams, activeValidatorsUpdate: [] },
					certificate,
					partnerValidators,
				),
			).toBeUndefined();
		});

		it('should return undefined when newCertificateThreshold is zero', () => {
			expect(
				checkValidatorsHashWithCertificate(
					{ ...txParams, newCertificateThreshold: BigInt(0) },
					certificate,
					partnerValidators,
				),
			).toBeUndefined();
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
			jest
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
		});
	});
});
