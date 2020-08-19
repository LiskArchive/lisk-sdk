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
import { codec } from '@liskhq/lisk-codec';
import { Transaction, transactionSchema } from '@liskhq/lisk-chain';
import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { TokenModule } from '../../../../../src/modules/token';
import {
	CHAIN_STATE_BURNT_FEE,
	GENESIS_BLOCK_MAX_BALANCE,
} from '../../../../../src/modules/token/constants';
import { createFakeDefaultAccount, StateStoreMock } from '../../../../utils/node';
import * as fixtures from './transfer_transaction_validate.json';
import { GenesisConfig } from '../../../../../src';

describe('token module', () => {
	let tokenModule: TokenModule;
	let validTransaction: any;
	let decodedTransaction: any;
	let senderAccount: any;
	let recipientAccount: any;
	let stateStore: any;
	let genesisBlock: any;
	let reducerHandler: any;
	const defaultTestCase = fixtures.testCases[0];
	const minRemainingBalance = '1';
	const genesisConfig: GenesisConfig = {
		baseFees: [
			{
				assetType: 0,
				baseFee: '10000000',
				moduleType: 2,
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
		minRemainingBalance,
	};

	beforeEach(() => {
		tokenModule = new TokenModule(genesisConfig);
		const buffer = Buffer.from(defaultTestCase.output.transaction, 'base64');
		decodedTransaction = codec.decode<Transaction>(transactionSchema, buffer);
		validTransaction = new Transaction(decodedTransaction);
		senderAccount = createFakeDefaultAccount({
			address: Buffer.from(defaultTestCase.input.account.address, 'base64'),
			token: {
				balance: BigInt('1000000000000000'),
			},
		});
		recipientAccount = createFakeDefaultAccount({
			address: Buffer.from(defaultTestCase.input.account.address, 'base64'),
			token: {
				balance: BigInt('1000000000000000'),
			},
		});
		genesisBlock = {
			header: {
				asset: {
					accounts: [senderAccount],
				},
			},
		};
		stateStore = new StateStoreMock([senderAccount, recipientAccount]);
		jest.spyOn(stateStore.account, 'getOrDefault').mockResolvedValue(senderAccount);
		jest.spyOn(stateStore.account, 'get').mockResolvedValue(senderAccount);
		jest.spyOn(stateStore.account, 'set');
		jest.spyOn(stateStore.chain, 'get');
		jest.spyOn(stateStore.chain, 'set');

		reducerHandler = {};
	});

	describe('#beforeTransactionApply', () => {
		it('should not throw error if fee is equal or higher or equal to min fee', async () => {
			return expect(
				tokenModule.beforeTransactionApply({
					stateStore,
					transaction: validTransaction,
					reducerHandler,
				}),
			).resolves.toBeUndefined();
		});

		it('should not throw error if transaction asset does not have a baseFee entry and transaction fee is higher or equal to min fee', async () => {
			tokenModule = new TokenModule({
				...genesisConfig,
				baseFees: [
					{
						assetType: 0,
						baseFee: undefined as any,
						moduleType: 2,
					},
				],
			});

			return expect(
				tokenModule.beforeTransactionApply({
					stateStore,
					transaction: validTransaction,
					reducerHandler,
				}),
			).resolves.toBeUndefined();
		});

		it('should throw error if fee is lower than minimum required fee', async () => {
			validTransaction.fee = BigInt(0);
			const expectedMinFee =
				BigInt(genesisConfig.minFeePerByte) * BigInt(validTransaction.getBytes().length) +
				BigInt(genesisConfig.baseFees[0].baseFee);

			return expect(
				tokenModule.beforeTransactionApply({
					stateStore,
					transaction: validTransaction,
					reducerHandler,
				}),
			).rejects.toStrictEqual(
				new Error(
					`Insufficient transaction fee. Minimum required fee is: ${expectedMinFee.toString()}`,
				),
			);
		});
	});

	describe('#afterTransactionApply', () => {
		it('should not throw error if account has sufficient balance', async () => {
			return expect(
				tokenModule.afterTransactionApply({
					stateStore,
					transaction: validTransaction,
					reducerHandler,
				}),
			).resolves.toBeUndefined();
		});

		it('should throw error when sender balance is below the minimum required balance', async () => {
			senderAccount.token.balance = BigInt(0);

			return expect(
				tokenModule.afterTransactionApply({
					stateStore,
					transaction: validTransaction,
					reducerHandler,
				}),
			).rejects.toStrictEqual(
				new Error(
					`Account does not have enough minimum remaining balance: ${senderAccount.address.toString(
						'base64',
					)}. Current balance is: 0. Required minimum balance is: ${minRemainingBalance}.`,
				),
			);
		});
	});
});
