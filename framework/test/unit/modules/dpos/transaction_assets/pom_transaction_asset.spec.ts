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

import { when } from 'jest-when';
import { BlockHeader, Account } from '@liskhq/lisk-chain';
import { objects } from '@liskhq/lisk-utils';
import { getAddressAndPublicKeyFromPassphrase, getRandomBytes } from '@liskhq/lisk-cryptography';
import { ApplyAssetContext, ValidateAssetContext } from '../../../../../src';
import {
	BlockHeaderAssetForDPOS,
	DPOSAccountProps,
	PomTransactionAssetContext,
	DPoSModule,
} from '../../../../../src/modules/dpos';
import { PomTransactionAsset } from '../../../../../src/modules/dpos/transaction_assets/pom_transaction_asset';
import * as dposUtils from '../../../../../src/modules/dpos/utils';
import { liskToBeddows } from '../../../../utils/assets';
import * as testing from '../../../../../src/testing';

const { StateStoreMock } = testing.mocks;

describe('PomTransactionAsset', () => {
	const lastBlockHeight = 8760000;
	const lastBlockReward = liskToBeddows(69);
	let transactionAsset: PomTransactionAsset;
	let applyContext: ApplyAssetContext<PomTransactionAssetContext>;
	let validateContext: ValidateAssetContext<PomTransactionAssetContext>;
	let sender: any;
	let stateStoreMock: testing.mocks.StateStoreMock;
	let misBehavingDelegate: Account<DPOSAccountProps>;
	let normalDelegate: Account<DPOSAccountProps>;
	let header1: BlockHeader<BlockHeaderAssetForDPOS>;
	let header2: BlockHeader<BlockHeaderAssetForDPOS>;

	beforeEach(() => {
		sender = testing.fixtures.createDefaultAccount<DPOSAccountProps>([DPoSModule], {});

		const {
			address: delegate1Address,
			publicKey: delegate1PublicKey,
		} = getAddressAndPublicKeyFromPassphrase(getRandomBytes(20).toString('utf8'));

		misBehavingDelegate = testing.fixtures.createDefaultAccount<DPOSAccountProps>([DPoSModule], {
			address: delegate1Address,
			dpos: { delegate: { username: 'misBehavingDelegate' } },
		});
		normalDelegate = testing.fixtures.createDefaultAccount<DPOSAccountProps>([DPoSModule], {
			dpos: { delegate: { username: 'normalDelegate' } },
		});
		const { id: id1, ...fakeBlockHeader1 } = testing.createFakeBlockHeader({
			generatorPublicKey: delegate1PublicKey,
		});
		const { id: id2, ...fakeBlockHeader2 } = testing.createFakeBlockHeader({
			generatorPublicKey: delegate1PublicKey,
		});

		header1 = fakeBlockHeader1 as BlockHeader;
		header2 = fakeBlockHeader2 as BlockHeader;

		stateStoreMock = new StateStoreMock({
			accounts: objects.cloneDeep([sender, misBehavingDelegate, normalDelegate]),
			lastBlockHeaders: [{ height: lastBlockHeight }] as any,
			lastBlockReward,
		});

		transactionAsset = new PomTransactionAsset();

		const transaction = {
			senderAddress: sender.address,
		} as any;

		const asset = {
			header1: {} as any,
			header2: {} as any,
		};

		applyContext = testing.createApplyAssetContext<PomTransactionAssetContext>({
			transaction,
			asset,
			stateStore: stateStoreMock,
			reducerHandler: {
				invoke: jest.fn(),
			},
		});

		validateContext = testing.createValidateAssetContext({ asset, transaction });

		jest.spyOn(stateStoreMock.account, 'get');
		jest.spyOn(stateStoreMock.account, 'set');
	});

	describe('constructor', () => {
		it('should have valid id', () => {
			expect(transactionAsset.id).toEqual(3);
		});

		it('should have valid name', () => {
			expect(transactionAsset.name).toEqual('reportDelegateMisbehavior');
		});

		it('should have valid schema', () => {
			expect(transactionAsset.schema).toMatchSnapshot();
		});
	});

	describe('validate', () => {
		it('should throw error when generatorPublicKey does not match', () => {
			validateContext.asset = {
				header1: {
					...header1,
				},
				header2: { ...header2, generatorPublicKey: getRandomBytes(20) },
			};

			expect(() => transactionAsset.validate(validateContext)).toThrow(
				'BlockHeaders are not contradicting as per BFT violation rules.',
			);
		});

		it('should throw error when both headers are identical', () => {
			validateContext.asset = {
				header1: {
					...header1,
				},
				header2: { ...header1 },
			};

			expect(() => transactionAsset.validate(validateContext)).toThrow(
				'BlockHeaders are not contradicting as per BFT violation rules.',
			);
		});

		it('should not throw error when first height is equal to second height but equal maxHeightPrevoted', () => {
			validateContext.asset = {
				header1: {
					...header1,
					height: 10999,
					asset: { ...header1.asset, maxHeightPrevoted: 1099 },
				},
				header2: { ...header2, height: 10999 },
			};

			expect(() => transactionAsset.validate(validateContext)).not.toThrow();
		});

		it('should not throw error when first height is greater than the second height but equal maxHeightPrevoted', () => {
			validateContext.asset = {
				header1: {
					...header1,
					height: 10999,
					asset: { ...header1.asset, maxHeightPrevoted: 1099 },
				},
				header2: { ...header2, height: 11999 },
			};

			expect(() => transactionAsset.validate(validateContext)).not.toThrow();
		});

		it("should not throw error when height is greater than the second header's maxHeightPreviouslyForged", () => {
			validateContext.asset = {
				header1: {
					...header1,
					height: 120,
				},
				header2: {
					...header2,
					height: 123,
					asset: { ...header1.asset, maxHeightPreviouslyForged: 98 },
				},
			};

			expect(() => transactionAsset.validate(validateContext)).not.toThrow();
		});

		it('should not throw error when maxHeightPrevoted is greater than the second maxHeightPrevoted', () => {
			validateContext.asset = {
				header1: {
					...header1,
					height: 133,
					asset: { ...header1.asset, maxHeightPrevoted: 101 },
				},
				header2: { ...header2, height: 123, asset: { ...header1.asset, maxHeightPrevoted: 98 } },
			};

			expect(() => transactionAsset.validate(validateContext)).not.toThrow();
		});

		it('should throw error when headers are not contradicting', () => {
			validateContext.asset = {
				header1: {
					...header1,
				},
				header2: { ...header1 },
			};

			expect(() => transactionAsset.validate(validateContext)).toThrow(
				'BlockHeaders are not contradicting as per BFT violation rules.',
			);
		});
	});

	describe('apply', () => {
		const block1Height = lastBlockHeight - 768;
		const block2Height = block1Height + 15;

		beforeEach(() => {
			jest.spyOn(dposUtils, 'validateSignature').mockReturnValue(true);

			applyContext.asset = {
				header1: { ...header1, height: block1Height },
				header2: { ...header2, height: block2Height },
			};
		});

		afterEach(() => {
			(dposUtils.validateSignature as any).mockClear();
		});

		it('should not throw error with valid transactions', async () => {
			await expect(transactionAsset.apply(applyContext)).resolves.toBeUndefined();
		});

		it('should throw error if |header1.height - h| >= 260000', async () => {
			applyContext.asset = {
				...applyContext.asset,
				header1: {
					...applyContext.asset.header1,
					height: lastBlockHeight - 260000,
				},
			};

			await expect(transactionAsset.apply(applyContext)).rejects.toThrow(
				'Difference between header1.height and current height must be less than 260000.',
			);
		});

		it('should throw error if |header2.height - h| >= 260000', async () => {
			applyContext.asset = {
				...applyContext.asset,
				header2: {
					...applyContext.asset.header2,
					height: lastBlockHeight - 260000,
				},
			};

			await expect(transactionAsset.apply(applyContext)).rejects.toThrow(
				'Difference between header2.height and current height must be less than 260000.',
			);
		});

		it('should throw error when header1 is not properly signed', async () => {
			when(dposUtils.validateSignature as any)
				.calledWith(
					applyContext.asset.header1.generatorPublicKey,
					applyContext.asset.header1.signature,
					expect.any(Buffer),
				)
				.mockReturnValue(false);
			when(dposUtils.validateSignature as any)
				.calledWith(
					applyContext.asset.header2.generatorPublicKey,
					applyContext.asset.header2.signature,
					expect.any(Buffer),
				)
				.mockReturnValue(true);

			await expect(transactionAsset.apply(applyContext)).rejects.toThrow(
				'Invalid block signature for header 1',
			);
		});

		it('should throw error when header2 is not properly signed', async () => {
			when(dposUtils.validateSignature as any)
				.calledWith(
					'LSK_BH_',
					expect.any(Buffer),
					applyContext.asset.header1.generatorPublicKey,
					applyContext.asset.header1.signature,
					expect.any(Buffer),
				)
				.mockReturnValue(true);
			when(dposUtils.validateSignature as any)
				.calledWith(
					'LSK_BH_',
					expect.any(Buffer),
					applyContext.asset.header2.generatorPublicKey,
					applyContext.asset.header2.signature,
					expect.any(Buffer),
				)
				.mockReturnValue(false);

			await expect(transactionAsset.apply(applyContext)).rejects.toThrow(
				'Invalid block signature for header 2',
			);
		});

		it('should throw error if misbehaving account is not a delegate', async () => {
			const updatedDelegateAccount = objects.cloneDeep(misBehavingDelegate);
			updatedDelegateAccount.dpos.delegate.username = '';
			await stateStoreMock.account.set(misBehavingDelegate.address, updatedDelegateAccount);

			await expect(transactionAsset.apply(applyContext)).rejects.toThrow(
				'Account is not a delegate',
			);
		});

		it('should throw error if misbehaving account is already banned', async () => {
			const updatedDelegateAccount = objects.cloneDeep(misBehavingDelegate);
			updatedDelegateAccount.dpos.delegate.isBanned = true;
			await stateStoreMock.account.set(misBehavingDelegate.address, updatedDelegateAccount);

			await expect(transactionAsset.apply(applyContext)).rejects.toThrow(
				'Cannot apply proof-of-misbehavior. Delegate is already banned.',
			);
		});

		it('should throw error if misbehaving account is already punished at height h', async () => {
			const updatedDelegateAccount = objects.cloneDeep(misBehavingDelegate);
			updatedDelegateAccount.dpos.delegate.pomHeights = [applyContext.asset.header1.height + 10];
			await stateStoreMock.account.set(misBehavingDelegate.address, updatedDelegateAccount);

			await expect(transactionAsset.apply(applyContext)).rejects.toThrow(
				'Cannot apply proof-of-misbehavior. Delegate is already punished.',
			);
		});

		it('should reward the sender with last block reward if delegate have enough balance', async () => {
			const remainingBalance = lastBlockReward + BigInt('10000000000');
			const minRemainingBalance = BigInt('5000000');

			when(applyContext.reducerHandler.invoke as any)
				.calledWith('token:getBalance', { address: misBehavingDelegate.address })
				.mockResolvedValue(remainingBalance as never);
			when(applyContext.reducerHandler.invoke as any)
				.calledWith('token:getMinRemainingBalance')
				.mockResolvedValue(minRemainingBalance as never);

			await transactionAsset.apply(applyContext);

			expect(applyContext.reducerHandler.invoke).toHaveBeenCalledWith('token:credit', {
				address: applyContext.transaction.senderAddress,
				amount: lastBlockReward,
			});
		});

		it('should not reward the sender if delegate does not have enough minimum remaining balance', async () => {
			const remainingBalance = BigInt(100);
			const minRemainingBalance = BigInt('5000000');

			when(applyContext.reducerHandler.invoke as any)
				.calledWith('token:getBalance', { address: misBehavingDelegate.address })
				.mockResolvedValue(remainingBalance as never);
			when(applyContext.reducerHandler.invoke as any)
				.calledWith('token:getMinRemainingBalance')
				.mockResolvedValue(minRemainingBalance as never);

			await transactionAsset.apply(applyContext);

			// If amount is zero, it should not call the credit
			expect(applyContext.reducerHandler.invoke).not.toHaveBeenCalledWith('token:credit', {
				address: applyContext.transaction.senderAddress,
				amount: BigInt(0),
			});
			expect(applyContext.reducerHandler.invoke).not.toHaveBeenCalledWith('token:debit', {
				address: applyContext.transaction.senderAddress,
				amount: BigInt(0),
			});
		});

		it('should add (remaining balance - min remaining balance) of delegate to balance of the sender if delegate balance is less than last block reward', async () => {
			const remainingBalance = lastBlockReward - BigInt(1);
			const minRemainingBalance = BigInt('5000000');

			when(applyContext.reducerHandler.invoke as any)
				.calledWith('token:getBalance', { address: misBehavingDelegate.address })
				.mockResolvedValue(remainingBalance as never);
			when(applyContext.reducerHandler.invoke as any)
				.calledWith('token:getMinRemainingBalance')
				.mockResolvedValue(minRemainingBalance as never);

			await transactionAsset.apply(applyContext);

			expect(applyContext.reducerHandler.invoke).toHaveBeenCalledWith('token:credit', {
				address: applyContext.transaction.senderAddress,
				amount: remainingBalance - minRemainingBalance,
			});
		});

		it('should append height h to pomHeights property of misbehaving account', async () => {
			await transactionAsset.apply(applyContext);

			const updatedDelegate = await stateStoreMock.account.get<Account<DPOSAccountProps>>(
				misBehavingDelegate.address,
			);

			expect(updatedDelegate.dpos.delegate.pomHeights).toEqual([lastBlockHeight + 1]);
		});

		it('should set isBanned property to true is pomHeights.length === 5', async () => {
			const pomHeights = [500, 1000, 2000, 4550];
			const updatedDelegateAccount = objects.cloneDeep(misBehavingDelegate);
			updatedDelegateAccount.dpos.delegate.pomHeights = objects.cloneDeep(pomHeights);
			updatedDelegateAccount.dpos.delegate.isBanned = false;
			await stateStoreMock.account.set(misBehavingDelegate.address, updatedDelegateAccount);

			await transactionAsset.apply(applyContext);

			const updatedDelegate = await stateStoreMock.account.get<Account<DPOSAccountProps>>(
				misBehavingDelegate.address,
			);

			expect(updatedDelegate.dpos.delegate.pomHeights).toEqual([
				...pomHeights,
				lastBlockHeight + 1,
			]);
			expect(updatedDelegate.dpos.delegate.pomHeights).toHaveLength(5);
			expect(updatedDelegate.dpos.delegate.isBanned).toBeTrue();
		});

		it('should not return balance if sender and delegate account are same', async () => {
			(applyContext.transaction as any).senderAddress = misBehavingDelegate.address;

			await expect(transactionAsset.apply(applyContext)).resolves.toBeUndefined();
		});
	});
});
