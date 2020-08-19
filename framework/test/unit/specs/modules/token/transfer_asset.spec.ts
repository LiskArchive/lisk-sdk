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
/*
 * Copyright © 2019 Lisk Foundation
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
 *
 */
import { Transaction, transactionSchema } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { TransferAsset } from '../../../../../src/modules/token';
import { MAX_TRANSACTION_AMOUNT } from '../../../../../src/modules/token/constants';
import { createFakeDefaultAccount, StateStoreMock } from '../../../../utils/node';
import * as fixtures from './transfer_transaction_validate.json';

describe('Transfer asset', () => {
	let validTransaction: any;
	let decodedTransferTransaction: any;
	let decodedAsset: any;
	let sender: any;
	let recipient: any;
	let stateStore: any;
	let storeAccountGetOrDefaultStub: jest.SpyInstance;
	let storeAccountSetStub: jest.SpyInstance;
	let transferAsset: TransferAsset;
	let reducerHandler: any;
	const defaultTestCase = fixtures.testCases[0];
	const minRemainingBalance = '1';

	beforeEach(() => {
		const buffer = Buffer.from(defaultTestCase.output.transaction, 'base64');
		const decodedTransaction = codec.decode<Transaction>(transactionSchema, buffer);
		transferAsset = new TransferAsset(BigInt(minRemainingBalance));
		decodedAsset = codec.decode<TransferAsset>(transferAsset.assetSchema, decodedTransaction.asset);
		decodedTransferTransaction = {
			...decodedTransaction,
			asset: decodedAsset,
		};
		validTransaction = new Transaction(decodedTransferTransaction);
		sender = createFakeDefaultAccount({
			address: Buffer.from(defaultTestCase.input.account.address, 'base64'),
			token: {
				balance: BigInt('1000000000000000'),
			},
		});
		recipient = createFakeDefaultAccount({
			address: Buffer.from(defaultTestCase.input.account.address, 'base64'),
			token: {
				balance: BigInt('1000000000000000'),
			},
		});
		stateStore = new StateStoreMock([sender, recipient]);
		storeAccountGetOrDefaultStub = jest
			.spyOn(stateStore.account, 'getOrDefault')
			.mockResolvedValue(recipient);
		jest.spyOn(stateStore.account, 'get').mockResolvedValue(sender);
		storeAccountSetStub = jest.spyOn(stateStore.account, 'set');
		reducerHandler = {};
	});

	describe('#applyAsset', () => {
		it('should return not throw error with a valid transfer asset', () => {
			expect(async () =>
				transferAsset.applyAsset({
					asset: validTransaction.asset,
					senderID: validTransaction.address,
					stateStore,
					reducerHandler,
					transaction: validTransaction,
				}),
			).not.toThrow();
		});

		it('should call state store with a valid transfer asset', async () => {
			await transferAsset.applyAsset({
				asset: validTransaction.asset,
				senderID: validTransaction.address,
				stateStore,
				reducerHandler,
				transaction: validTransaction,
			});
			expect(stateStore.account.get).toHaveBeenCalledWith(validTransaction.address);
			expect(storeAccountSetStub).toHaveBeenCalledWith(
				sender.address,
				expect.objectContaining({
					address: sender.address,
				}),
			);
			expect(stateStore.account.getOrDefault).toHaveBeenCalledWith(
				validTransaction.asset.recipientAddress,
			);
			expect(stateStore.account.set).toHaveBeenCalledWith(
				recipient.address,
				expect.objectContaining({
					address: recipient.address,
				}),
			);
		});

		it('should throw error when recipient balance is over maximum amount', async () => {
			storeAccountGetOrDefaultStub.mockResolvedValue({
				...recipient,
				token: {
					...recipient.token,
					balance: BigInt(MAX_TRANSACTION_AMOUNT),
				},
			});
			return expect(async () =>
				transferAsset.applyAsset({
					asset: validTransaction.asset,
					senderID: validTransaction.address,
					stateStore,
					reducerHandler,
					transaction: validTransaction,
				}),
			).rejects.toStrictEqual(
				new Error(
					`Invalid transfer amount: ${decodedAsset.amount.toString()}. Maximum allowed balance for recipient is: ${MAX_TRANSACTION_AMOUNT}`,
				),
			);
		});

		it('should throw error when recipient balance is below minimum remaining balance', async () => {
			storeAccountGetOrDefaultStub.mockResolvedValue({
				...recipient,
				token: {
					...recipient.token,
					balance: BigInt(0),
				},
			});
			return expect(async () =>
				transferAsset.applyAsset({
					asset: { ...validTransaction.asset, amount: BigInt(0) },
					senderID: validTransaction.address,
					stateStore,
					reducerHandler,
					transaction: validTransaction,
				}),
			).rejects.toStrictEqual(
				new Error(
					`Recipient account does not have enough minimum remaining LSK: ${recipient.address.toString(
						'base64',
					)}. Minimum required balance: ${minRemainingBalance}. Remaining balance: 0`,
				),
			);
		});
	});
});
