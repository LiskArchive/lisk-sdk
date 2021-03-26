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
import { GenesisConfig, Transaction } from '../../../../src';
import { NonceOutOfBoundsError } from '../../../../src/errors';
import { InvalidNonceError, SequenceModule } from '../../../../src/modules/sequence';
import { TransferAsset } from '../../../../src/modules/token';
import * as testing from '../../../../src/testing';

jest.mock('@liskhq/lisk-cryptography', () => ({
	...jest.requireActual('@liskhq/lisk-cryptography'),
}));

describe('sequence module', () => {
	let sequenceModule: SequenceModule;
	const senderAddress = cryptography.getRandomBytes(20);
	const senderAccount = {
		address: senderAddress,
		sequence: {
			nonce: BigInt(2),
		},
	};

	const sampleTx = testing.createTransaction({
		nonce: BigInt(2),
		assetClass: TransferAsset,
		moduleID: 2,
		fee: BigInt(1),
		passphrase: cryptography.getRandomBytes(20).toString('hex'),
		networkIdentifier: cryptography.getRandomBytes(20),
		asset: {
			amount: BigInt(10),
			recipientAddress: cryptography.getRandomBytes(20),
			data: '',
		},
	});

	const genesisConfig: GenesisConfig = {
		baseFees: [
			{
				assetID: 0,
				baseFee: '1',
				moduleID: 3,
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

	const getAddressFromPublicKeyMock = jest.fn().mockReturnValue(senderAddress);

	beforeEach(() => {
		sequenceModule = testing.getModuleInstance(SequenceModule, { genesisConfig });
		(cryptography as any).getAddressFromPublicKey = getAddressFromPublicKeyMock;
	});

	describe('incompatible nonce', () => {
		it('should throw NonceOutOfBoundsError error for tx nonce lower than account nonce', async () => {
			// Arrange
			const transaction = ({
				...sampleTx,
				nonce: BigInt(0),
				id: sampleTx.id,
			} as unknown) as Transaction;
			const context = testing.createTransactionApplyContext({ transaction });
			jest.spyOn(context.stateStore.account, 'get');
			when(context.stateStore.account.get as any)
				.calledWith(senderAddress)
				.mockResolvedValue(senderAccount as never);

			let receivedError;
			try {
				// Act
				await sequenceModule.beforeTransactionApply(context);
			} catch (error) {
				receivedError = error;
			}
			// Assert
			expect(receivedError).toBeInstanceOf(InvalidNonceError);
			expect(receivedError.code).toEqual('ERR_INVALID_NONCE');
			expect(receivedError.message).toContain(
				`Transaction with id:${transaction.id.toString('hex')} nonce is lower than account nonce`,
			);
			expect(receivedError.actual).toEqual(transaction.nonce.toString());
			expect(receivedError.expected).toEqual(senderAccount.sequence.nonce.toString());
		});

		it('should throw NonceOutOfBoundsError error for tx nonce not equal to account nonce', async () => {
			// Arrange
			const transaction = ({
				...sampleTx,
				nonce: BigInt(4),
				id: sampleTx.id,
			} as unknown) as Transaction;
			const context = testing.createTransactionApplyContext({ transaction });
			jest.spyOn(context.stateStore.account, 'get');
			when(context.stateStore.account.get as any)
				.calledWith(senderAddress)
				.mockResolvedValue(senderAccount as never);

			let receivedError;
			try {
				// Act
				await sequenceModule.afterTransactionApply(context);
			} catch (error) {
				receivedError = error;
			}
			// Assert
			expect(receivedError).toBeInstanceOf(NonceOutOfBoundsError);
			expect(receivedError.code).toEqual('ERR_NONCE_OUT_OF_BOUNDS');
			expect(receivedError.message).toContain(
				`Transaction with id:${transaction.id.toString('hex')} nonce is not equal to account nonce`,
			);
			expect(receivedError.actual).toEqual(transaction.nonce.toString());
			expect(receivedError.expected).toEqual(senderAccount.sequence.nonce.toString());
		});
	});

	describe('valid nonce', () => {
		it('should increment account nonce', async () => {
			// Arrange
			const transaction = (sampleTx as unknown) as Transaction;
			const context = testing.createTransactionApplyContext({ transaction });
			jest.spyOn(context.stateStore.account, 'get');
			jest.spyOn(context.stateStore.account, 'set');
			const updatedAccount = { ...senderAccount, sequence: { ...senderAccount.sequence } };
			when(context.stateStore.account.get as any)
				.calledWith(senderAddress)
				.mockResolvedValue(updatedAccount as never);

			// Act
			await sequenceModule.afterTransactionApply(context);

			// Assert
			expect(updatedAccount.sequence.nonce).toEqual(senderAccount.sequence.nonce + BigInt(1));
			expect(context.stateStore.account.set).toHaveBeenCalledTimes(1);
			expect(context.stateStore.account.set).toHaveBeenCalledWith(senderAddress, updatedAccount);
		});
	});
});
