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
import { testing as testingUtils } from '@liskhq/lisk-utils';
import { when } from 'jest-when';

import { SequenceModule } from '../../../../../src/modules/sequence';
import { GenesisConfig } from '../../../../../src';
import { NonceOutOfBoundsError } from '../../../../../src/errors';
import { InvalidNonceError } from '../../../../../src/modules/sequence';

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

	const stateStoreMock = new testingUtils.StateStoreMock({ accounts: [senderAccount] });

	stateStoreMock.account.get = jest.fn();
	stateStoreMock.account.set = jest.fn();

	const reducerMock = { invoke: jest.fn() };
	const getAddressFromPublicKeyMock = jest.fn().mockReturnValue(senderAddress);

	beforeEach(() => {
		sequenceModule = new SequenceModule(genesisConfig);
		(cryptography as any).getAddressFromPublicKey = getAddressFromPublicKeyMock;
	});

	describe('incompatible nonce', () => {
		it('should throw NonceOutOfBoundsError error for tx nonce lower than account nonce', async () => {
			// Arrange
			const tx = { ...sampleTx, nonce: BigInt(0) };
			when(stateStoreMock.account.get as any)
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
			expect(receivedError).toBeInstanceOf(InvalidNonceError);
			expect(receivedError.code).toEqual('ERR_INVALID_NONCE');
			expect(receivedError.message).toContain(
				`Transaction with id:${tx.id.toString()} nonce is lower than account nonce`,
			);
			expect(receivedError.actual).toEqual(tx.nonce.toString());
			expect(receivedError.expected).toEqual(senderAccount.sequence.nonce.toString());
		});

		it('should throw NonceOutOfBoundsError error for tx nonce not equal to account nonce', async () => {
			// Arrange
			const tx = { ...sampleTx, nonce: BigInt(4) };
			when(stateStoreMock.account.get as any)
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
			expect(receivedError).toBeInstanceOf(NonceOutOfBoundsError);
			expect(receivedError.code).toEqual('ERR_NONCE_OUT_OF_BOUNDS');
			expect(receivedError.message).toContain(
				`Transaction with id:${tx.id.toString()} nonce is not equal to account nonce`,
			);
			expect(receivedError.actual).toEqual(tx.nonce.toString());
			expect(receivedError.expected).toEqual(senderAccount.sequence.nonce.toString());
		});
	});

	describe('valid nonce', () => {
		it('should increment account nonce', async () => {
			// Arrange
			const updatedAccount = { ...senderAccount, sequence: { ...senderAccount.sequence } };
			when(stateStoreMock.account.get as any)
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
