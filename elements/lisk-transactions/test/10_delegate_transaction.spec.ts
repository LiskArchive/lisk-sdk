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
import { codec } from '@liskhq/lisk-codec';
import { hash } from '@liskhq/lisk-cryptography';
import { defaultAccount, StateStoreMock } from './utils/state_store_mock';
import {
	DelegateTransaction,
	DelegateAsset,
} from '../src/10_delegate_transaction';
import { validDelegateAccount } from '../fixtures';
import * as fixtures from '../fixtures/transaction_network_id_and_change_order/delegate_transaction_validate.json';
import { Account, BlockHeader, AccountAsset } from '../src/types';
import { BaseTransaction } from '../src';

describe('Delegate registration transaction class', () => {
	const testCase = fixtures.testCases[0];
	const lastBlockHeight = 200;

	let validTestTransaction: DelegateTransaction;
	let store: StateStoreMock;
	let sender: Account;

	const validDelegateAccountObj = defaultAccount({
		balance: BigInt(validDelegateAccount.balance),
		address: Buffer.from(testCase.input.account.address, 'base64'),
		publicKey: Buffer.from(testCase.input.account.publicKey, 'base64'),
	});

	beforeEach(() => {
		const buffer = Buffer.from(testCase.output.transaction, 'base64');
		const id = hash(buffer);
		const decodedBaseTransaction = codec.decode<BaseTransaction>(
			BaseTransaction.BASE_SCHEMA,
			buffer,
		);
		const decodedAsset = codec.decode<DelegateAsset>(
			DelegateTransaction.ASSET_SCHEMA,
			decodedBaseTransaction.asset as Buffer,
		);
		validTestTransaction = new DelegateTransaction({
			...decodedBaseTransaction,
			asset: decodedAsset,
			id,
		});

		sender = validDelegateAccountObj;

		store = new StateStoreMock([sender], {
			lastBlockHeader: { height: lastBlockHeight } as BlockHeader,
		});

		jest.spyOn(store.account, 'get');
		jest.spyOn(store.account, 'set');
	});

	describe('#validateAsset', () => {
		it('should return true when valid username is provided', () => {
			(validTestTransaction as any).asset.username = 'obelisk';
			return expect((validTestTransaction as any).validateAsset()).toBeEmpty();
		});

		it('should return false when username includes capital letter', () => {
			(validTestTransaction as any).asset.username = 'Obelisk';
			const errors = (validTestTransaction as any).validateAsset();
			return expect(errors[0].dataPath).toBe('.asset.username');
		});

		it('should return false when username is like address', () => {
			(validTestTransaction as any).asset.username = '17670127987160191762l';
			const errors = (validTestTransaction as any).validateAsset();
			return expect(errors[0].dataPath).toBe('.asset.username');
		});

		it('should return false when username includes forbidden character', () => {
			(validTestTransaction as any).asset.username = 'obe^lisk';
			const errors = (validTestTransaction as any).validateAsset();
			return expect(errors[0].dataPath).toBe('.asset.username');
		});

		it('should return false when username includes forbidden null character', () => {
			(validTestTransaction as any).asset.username = 'obe\0lisk';
			const errors = (validTestTransaction as any).validateAsset();
			return expect(errors[0].dataPath).toBe('.asset.username');
		});
	});

	describe('#minFee', () => {
		it('should set the minFee to nameFee plus minFeePerByte times bytelength', () => {
			const byteLength = BigInt(validTestTransaction.getBytes().length);
			const nameFee = 1000000000;
			const minFeePerByte = 1000;

			expect(validTestTransaction.minFee).toEqual(
				BigInt(nameFee) + byteLength * BigInt(minFeePerByte),
			);
		});
	});

	describe('#applyAsset', () => {
		it('should call state store', async () => {
			await (validTestTransaction as any).applyAsset(store);
			expect(store.account.get).toHaveBeenCalledWith(
				validTestTransaction.senderId,
			);
			expect(store.account.set).toHaveBeenCalledWith(sender.address, {
				...sender,
				asset: {
					...sender.asset,
					delegate: {
						...sender.asset.delegate,
						username: validTestTransaction.asset.username,
					},
				},
			});
		});

		it('should return no errors', async () => {
			store.account.set(
				sender.address,
				defaultAccount({ address: sender.address }),
			);
			const errors = await (validTestTransaction as any).applyAsset(store);
			expect(errors).toHaveLength(0);
		});

		it('should return error when username is taken', async () => {
			const delegatesUserNamesSchema = {
				$id: '/dpos/userNames',
				type: 'object',
				properties: {
					registeredDelegates: {
						type: 'array',
						fieldNumber: 1,
						items: {
							type: 'object',
							properties: {
								username: {
									dataType: 'string',
									fieldNumber: 1,
								},
								address: {
									dataType: 'bytes',
									fieldNumber: 2,
								},
							},
						},
					},
				},
				required: ['registeredDelegates'],
			};

			const senderClone = sender;
			senderClone.asset.delegate.username = validTestTransaction.asset.username;

			store.account.set(senderClone.address, senderClone);

			store.chain.set(
				'delegateUsernames',
				codec.encode(delegatesUserNamesSchema, {
					registeredDelegates: [
						{
							username: validTestTransaction.asset.username,
							address: Buffer.from('random'),
						},
					],
				}),
			);

			const errors = await (validTestTransaction as any).applyAsset(store);

			expect(errors).toHaveLength(2);
			expect(errors[0].dataPath).toBe('.asset.username');
			expect(errors[1].message).toBe('Account is already a delegate');
		});

		it('should return an error when account is already delegate', async () => {
			const defaultVal = defaultAccount();
			store.account.set(
				sender.address,
				defaultAccount({
					address: sender.address,
					asset: {
						...defaultVal.asset,
						delegate: {
							...defaultVal.asset.delegate,
							username: 'alreadydelegate',
						},
					},
				}),
			);
			const errors = await (validTestTransaction as any).applyAsset(store);

			expect(errors).toHaveLength(1);
			expect(errors[0].dataPath).toBe('.asset.username');
		});

		it('should set lastForgedHeight to the lastBlock height + 1', async () => {
			store.account.set(
				sender.address,
				defaultAccount({ address: sender.address }),
			);
			await (validTestTransaction as any).applyAsset(store);
			const updatedSender = await store.account.get<AccountAsset>(
				sender.address,
			);
			expect(updatedSender.asset.delegate.lastForgedHeight).toEqual(
				lastBlockHeight + 1,
			);
		});
	});
});
