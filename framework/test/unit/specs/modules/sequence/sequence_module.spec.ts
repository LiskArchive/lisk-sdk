/*
 * Copyright © 2020 Lisk Foundation
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

import * as cryptography from '@liskhq/lisk-cryptography';
import { when } from 'jest-when';

import { SequenceModule } from '../../../../../src/modules/sequence';
import { GenesisConfig } from '../../../../../src';
import { SequenceModuleError } from '../../../../../src/errors';

describe('sequence module', () => {
	let sequenceModule: SequenceModule;
	const senderAddress = cryptography.getRandomBytes(20);
	const senderAccount = {
		address: senderAddress,
		sequence: {
			nonce: BigInt(2),
		},
	};

	const sampleTx = {
		nonce: BigInt(2),
		id: cryptography.getRandomBytes(32),
		assetType: 0,
		baseFee: BigInt(1),
		moduleType: 3,
		fee: BigInt(1),
		senderPublicKey: Buffer.from(''),
		signatures: [],
		asset: Buffer.from(''),
	};

	const genesisConfig: GenesisConfig = {
		baseFees: [
			{
				assetType: 0,
				baseFee: BigInt(1),
				moduleType: 3,
			},
		],
		bftThreshold: 67,
		blockTime: 10,
		communityIdentifier: 'lisk',
		maxPayloadLength: 15360,
		minFeePerByte: 1,
		rewards: {
			distance: 1,
			milestones: ['milestone'],
			offset: 2,
		},
	};

	const stateStoreMock = {
		account: {
			getOrDefault: jest.fn(),
			set: jest.fn(),
		},
	};

	const reducerMock = { invoke: jest.fn() };
	const getAddressFromPublicKeyMock = jest.fn().mockReturnValue(senderAddress);

	beforeEach(() => {
		sequenceModule = new SequenceModule(genesisConfig);
		(cryptography as any).getAddressFromPublicKey = getAddressFromPublicKeyMock;
	});

	describe('incompatible nonce', () => {
		it('should return a failed transaction response for incompatible nonce', async () => {
			// Arrange
			const tx = { ...sampleTx, nonce: BigInt(0) };
			when(stateStoreMock.account.getOrDefault)
				.calledWith()
				.mockResolvedValue(senderAccount as never);

			let receivedError;
			try {
				// Act
				await sequenceModule.beforeTransactionApply({
					stateStore: stateStoreMock as any,
					reducerHandler: reducerMock,
					tx,
				});
			} catch (error) {
				receivedError = error;
			}
			// Assert
			expect(receivedError).toBeInstanceOf(SequenceModuleError);
			expect(receivedError.moduleName).toEqual('sequence');
			expect(receivedError.message).toContain(
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				`Incompatible transaction nonce for account: ${senderAccount.address.toString(
					'base64',
				)}, Tx Nonce: ${tx.nonce.toString()}, Account Nonce: ${senderAccount.sequence.nonce.toString()}`,
			);
			expect(receivedError.actual).toEqual(tx.nonce.toString());
			expect(receivedError.expected).toEqual(senderAccount.sequence.nonce.toString());
		});

		it('should return a failed transaction response for incompatible higher nonce', async () => {
			// Arrange
			const tx = { ...sampleTx, nonce: BigInt(4) };
			when(stateStoreMock.account.getOrDefault)
				.calledWith()
				.mockResolvedValue(senderAccount as never);
			let receivedError;
			try {
				// Act
				await sequenceModule.afterTransactionApply({
					stateStore: stateStoreMock as any,
					reducerHandler: reducerMock,
					tx,
				});
			} catch (error) {
				receivedError = error;
			}
			// Assert
			expect(receivedError).toBeInstanceOf(SequenceModuleError);
			expect(receivedError.moduleName).toEqual('sequence');
			expect(receivedError.message).toContain(
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				`Incompatible transaction nonce for account: ${senderAccount.address.toString(
					'base64',
				)}, Tx Nonce: ${tx.nonce.toString()}, Account Nonce: ${senderAccount.sequence.nonce.toString()}`,
			);
			expect(receivedError.actual).toEqual(tx.nonce.toString());
			expect(receivedError.expected).toEqual(senderAccount.sequence.nonce.toString());
		});
	});

	describe('valid nonce', () => {
		it('should increment account nonce', async () => {
			// Arrange
			const updatedAccount = { ...senderAccount, sequence: { ...senderAccount.sequence } };
			when(stateStoreMock.account.getOrDefault)
				.calledWith()
				.mockResolvedValue(updatedAccount as never);

			// Act
			await sequenceModule.afterTransactionApply({
				stateStore: stateStoreMock as any,
				reducerHandler: reducerMock,
				tx: sampleTx,
			});

			// Assert
			expect(updatedAccount.sequence.nonce).toEqual(senderAccount.sequence.nonce + BigInt(1));
			expect(stateStoreMock.account.set).toHaveBeenCalledTimes(1);
			expect(stateStoreMock.account.set).toHaveBeenCalledWith(senderAddress, updatedAccount);
		});
	});
});
