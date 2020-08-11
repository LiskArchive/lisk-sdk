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
import { BlockHeader } from '@liskhq/lisk-chain';
import { objects } from '@liskhq/lisk-utils';
import { getAddressAndPublicKeyFromPassphrase, getRandomBytes } from '@liskhq/lisk-cryptography';
import { ApplyAssetInput, ValidateAssetInput, Account } from '../../../../../../src/modules';
import { createFakeDefaultAccount } from '../../../../../utils/node';
import { StateStoreMock } from '../../../../../utils/node/state_store_mock';
import {
	BlockHeaderAssetForDPOS,
	DPOSAccountProps,
	PomTransactionAssetInput,
} from '../../../../../../src/modules/dpos';
import { PomTransactionAsset } from '../../../../../../src/modules/dpos/transaction_assets/pom_transaction_asset';
import * as dposUtils from '../../../../../../src/modules/dpos/utils';
import { createFakeBlockHeader } from '../../../../../fixtures';
import { liskToBeddows } from '../../../../../utils/assets';

describe('UnlockTransactionAsset', () => {
	const lastBlockHeight = 8760000;
	const lastBlockReward = liskToBeddows(69);
	let transactionAsset: PomTransactionAsset;
	let applyInput: ApplyAssetInput<PomTransactionAssetInput>;
	let validateInput: ValidateAssetInput<PomTransactionAssetInput>;
	let sender: any;
	let stateStoreMock: StateStoreMock;
	let misBehavingDelegate: Account<DPOSAccountProps>;
	let normalDelegate: Account<DPOSAccountProps>;
	let header1: BlockHeader<BlockHeaderAssetForDPOS>;
	let header2: BlockHeader<BlockHeaderAssetForDPOS>;

	beforeEach(() => {
		sender = createFakeDefaultAccount({});

		const {
			address: delegate1Address,
			publicKey: delegate1PublicKey,
		} = getAddressAndPublicKeyFromPassphrase(getRandomBytes(20).toString('utf8'));

		misBehavingDelegate = createFakeDefaultAccount({
			address: delegate1Address,
			dpos: { delegate: { username: 'misBehavingDelegate' } },
		});
		normalDelegate = createFakeDefaultAccount({
			dpos: { delegate: { username: 'normalDelegate' } },
		});

		header1 = createFakeBlockHeader({ generatorPublicKey: delegate1PublicKey });
		header2 = createFakeBlockHeader({ generatorPublicKey: delegate1PublicKey });

		stateStoreMock = new StateStoreMock(
			objects.cloneDeep([sender, misBehavingDelegate, normalDelegate]),
			{
				lastBlockHeaders: [{ height: lastBlockHeight }] as any,
				lastBlockReward,
			},
		);
		transactionAsset = new PomTransactionAsset();
		applyInput = ({
			senderID: sender.address,
			asset: {
				header1: {},
				header2: {},
			},
			stateStore: stateStoreMock as any,
			reducerHandler: {
				invoke: jest.fn(),
			},
		} as unknown) as ApplyAssetInput<PomTransactionAssetInput>;
		validateInput = ({ asset: { header1: {}, header2: {} } } as unknown) as ValidateAssetInput<
			PomTransactionAssetInput
		>;

		jest.spyOn(stateStoreMock.account, 'get');
		jest.spyOn(stateStoreMock.account, 'set');
	});

	describe('constructor', () => {
		it('should have valid type', () => {
			expect(transactionAsset.type).toEqual(3);
		});

		it('should have valid name', () => {
			expect(transactionAsset.name).toEqual('pom');
		});

		it('should have valid accountSchema', () => {
			expect(transactionAsset.assetSchema).toMatchSnapshot();
		});

		it('should have valid baseFee', () => {
			expect(transactionAsset.baseFee).toEqual(BigInt(0));
		});
	});

	describe('validateAsset', () => {
		it('should not return errors when first height is equal to second height but equal maxHeightPrevoted', () => {
			validateInput.asset = {
				header1: {
					...header1,
					height: 10999,
					asset: { ...header1.asset, maxHeightPrevoted: 1099 },
				},
				header2: { ...header2, height: 10999 },
			};

			expect(() => transactionAsset.validateAsset(validateInput)).not.toThrow();
		});

		it('should not return errors when first height is greater than the second height but equal maxHeightPrevoted', () => {
			validateInput.asset = {
				header1: {
					...header1,
					height: 10999,
					asset: { ...header1.asset, maxHeightPrevoted: 1099 },
				},
				header2: { ...header2, height: 11999 },
			};

			expect(() => transactionAsset.validateAsset(validateInput)).not.toThrow();
		});

		it("should not return errors when height is greater than the second header's maxHeightPreviouslyForged", () => {
			validateInput.asset = {
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

			expect(() => transactionAsset.validateAsset(validateInput)).not.toThrow();
		});

		it('should not return errors when maxHeightPrevoted is greater than the second maxHeightPrevoted', () => {
			validateInput.asset = {
				header1: {
					...header1,
					height: 133,
					asset: { ...header1.asset, maxHeightPrevoted: 101 },
				},
				header2: { ...header2, height: 123, asset: { ...header1.asset, maxHeightPrevoted: 98 } },
			};

			expect(() => transactionAsset.validateAsset(validateInput)).not.toThrow();
		});

		it('should return errors when headers are not contradicting', () => {
			validateInput.asset = {
				header1: {
					...header1,
				},
				header2: { ...header1 },
			};

			expect(() => transactionAsset.validateAsset(validateInput)).toThrow(
				'BlockHeaders are identical. No contradiction detected.',
			);
		});
	});

	describe('applyAsset', () => {
		const block1Height = lastBlockHeight - 768;
		const block2Height = block1Height + 15;

		beforeEach(() => {
			jest.spyOn(dposUtils, 'validateSignature').mockReturnValue(true);

			applyInput.asset = {
				header1: { ...header1, height: block1Height },
				header2: { ...header2, height: block2Height },
			};
		});

		afterEach(() => {
			(dposUtils.validateSignature as any).mockClear();
		});

		it('should not return errors with valid transactions', async () => {
			await expect(transactionAsset.applyAsset(applyInput)).resolves.toBeUndefined();
		});

		it('should return errors if |header1.height - h| >= 260000', async () => {
			applyInput.asset = {
				...applyInput.asset,
				header1: {
					...applyInput.asset.header1,
					height: lastBlockHeight - 260000,
				},
			};

			await expect(transactionAsset.applyAsset(applyInput)).rejects.toThrow(
				'Difference between header1.height and current height must be less than 260000.',
			);
		});

		it('should return errors if |header2.height - h| >= 260000', async () => {
			applyInput.asset = {
				...applyInput.asset,
				header2: {
					...applyInput.asset.header2,
					height: lastBlockHeight - 260000,
				},
			};

			await expect(transactionAsset.applyAsset(applyInput)).rejects.toThrow(
				'Difference between header2.height and current height must be less than 260000.',
			);
		});

		it('should return errors when header1 is not properly signed', async () => {
			when(dposUtils.validateSignature as any)
				.calledWith(
					applyInput.asset.header1.generatorPublicKey,
					applyInput.asset.header1.signature,
					expect.any(Buffer),
				)
				.mockReturnValue(false);
			when(dposUtils.validateSignature as any)
				.calledWith(
					applyInput.asset.header2.generatorPublicKey,
					applyInput.asset.header2.signature,
					expect.any(Buffer),
				)
				.mockReturnValue(true);

			await expect(transactionAsset.applyAsset(applyInput)).rejects.toThrow(
				'Invalid block signature for header 1',
			);
		});

		it('should return errors when header2 is not properly signed', async () => {
			when(dposUtils.validateSignature as any)
				.calledWith(
					applyInput.asset.header1.generatorPublicKey,
					applyInput.asset.header1.signature,
					expect.any(Buffer),
				)
				.mockReturnValue(true);
			when(dposUtils.validateSignature as any)
				.calledWith(
					applyInput.asset.header2.generatorPublicKey,
					applyInput.asset.header2.signature,
					expect.any(Buffer),
				)
				.mockReturnValue(false);

			await expect(transactionAsset.applyAsset(applyInput)).rejects.toThrow(
				'Invalid block signature for header 2',
			);
		});

		it('should return errors if misbehaving account is not a delegate', async () => {
			const updatedDelegateAccount = objects.cloneDeep(misBehavingDelegate);
			updatedDelegateAccount.dpos.delegate.username = '';
			stateStoreMock.account.set(misBehavingDelegate.address, updatedDelegateAccount);

			await expect(transactionAsset.applyAsset(applyInput)).rejects.toThrow(
				'Account is not a delegate',
			);
		});

		it('should return errors if misbehaving account is already banned', async () => {
			const updatedDelegateAccount = objects.cloneDeep(misBehavingDelegate);
			updatedDelegateAccount.dpos.delegate.isBanned = true;
			stateStoreMock.account.set(misBehavingDelegate.address, updatedDelegateAccount);

			await expect(transactionAsset.applyAsset(applyInput)).rejects.toThrow(
				'Cannot apply proof-of-misbehavior. Delegate is banned.',
			);
		});

		it('should return errors if misbehaving account is already punished at height h', async () => {
			const updatedDelegateAccount = objects.cloneDeep(misBehavingDelegate);
			updatedDelegateAccount.dpos.delegate.pomHeights = [applyInput.asset.header1.height + 10];
			stateStoreMock.account.set(misBehavingDelegate.address, updatedDelegateAccount);

			await expect(transactionAsset.applyAsset(applyInput)).rejects.toThrow(
				'Cannot apply proof-of-misbehavior. Delegate is already punished.',
			);
		});

		it('should add remaining balance of delegate to balance of the sender if delegate balance is less than last block reward', async () => {
			const remainingBalance = lastBlockReward - BigInt(1);

			when(applyInput.reducerHandler.invoke as any)
				.calledWith('token:getBalance', { address: misBehavingDelegate.address })
				.mockResolvedValue(remainingBalance as never);

			await transactionAsset.applyAsset(applyInput);

			expect(applyInput.reducerHandler.invoke).toBeCalledWith('token:credit', {
				address: applyInput.senderID,
				amount: remainingBalance,
			});
		});

		it('should append height h to pomHeights property of misbehaving account', async () => {
			await transactionAsset.applyAsset(applyInput);

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
			stateStoreMock.account.set(misBehavingDelegate.address, updatedDelegateAccount);

			await transactionAsset.applyAsset(applyInput);

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
			applyInput.senderID = misBehavingDelegate.address;

			await expect(transactionAsset.applyAsset(applyInput)).resolves.toBeUndefined();
		});
	});
});
