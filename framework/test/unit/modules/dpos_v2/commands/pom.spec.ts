/*
 * Copyright © 2021 Lisk Foundation
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
import { BlockHeader, blockHeaderSchema, Transaction } from '@liskhq/lisk-chain';
import { objects } from '@liskhq/lisk-utils';
import { address, utils, legacy } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { ReportDelegateMisbehaviorCommand } from '../../../../../src/modules/dpos_v2/commands/pom';
import * as testing from '../../../../../src/testing';
import { REPORTING_PUNISHMENT_REWARD } from '../../../../../src/modules/dpos_v2/constants';
import {
	TokenMethod,
	ValidatorsMethod,
	PomTransactionParams,
} from '../../../../../src/modules/dpos_v2/types';
import { VerifyStatus } from '../../../../../src/state_machine/types';
import { DEFAULT_LOCAL_ID } from '../../../../utils/mocks/transaction';
import * as bftUtil from '../../../../../src/engine/bft/utils';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../../src/testing/in_memory_prefixed_state';
import { DPoSModule } from '../../../../../src';
import { DelegateAccount, DelegateStore } from '../../../../../src/modules/dpos_v2/stores/delegate';
import { createStoreGetter } from '../../../../../src/testing/utils';

describe('ReportDelegateMisbehaviorCommand', () => {
	const dpos = new DPoSModule();
	let pomCommand: ReportDelegateMisbehaviorCommand;
	let stateStore: PrefixedStateReadWriter;
	let delegateSubstore: DelegateStore;
	let mockTokenMethod: TokenMethod;
	let mockValidatorsMethod: ValidatorsMethod;
	const blockHeight = 8760000;
	const reportPunishmentReward = REPORTING_PUNISHMENT_REWARD;
	let context: any;
	let misBehavingDelegate: DelegateAccount;
	let normalDelegate: DelegateAccount;
	let header1: BlockHeader;
	let header2: BlockHeader;
	let transaction: any;
	let transactionParams: Buffer;
	let transactionParamsDecoded: PomTransactionParams;
	const publicKey = utils.getRandomBytes(32);
	const senderAddress = address.getAddressFromPublicKey(publicKey);
	const header = testing.createFakeBlockHeader({
		height: blockHeight,
	});
	const { publicKey: delegate1PublicKey } = legacy.getPrivateAndPublicKeyFromPassphrase(
		utils.getRandomBytes(20).toString('utf8'),
	);
	const delegate1Address = address.getAddressFromPublicKey(delegate1PublicKey);
	const defaultDelegateInfo = {
		totalVotesReceived: BigInt(100000000),
		selfVotes: BigInt(0),
		lastGeneratedHeight: 0,
		isBanned: false,
		pomHeights: [],
		consecutiveMissedBlocks: 0,
		commission: 0,
		lastCommissionIncreaseHeight: 0,
		sharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
	};

	beforeEach(async () => {
		pomCommand = new ReportDelegateMisbehaviorCommand(dpos.stores, dpos.events);
		mockTokenMethod = {
			lock: jest.fn(),
			unlock: jest.fn(),
			getAvailableBalance: jest.fn(),
			burn: jest.fn(),
			transfer: jest.fn(),
			getLockedAmount: jest.fn(),
		};
		mockValidatorsMethod = {
			setValidatorGeneratorKey: jest.fn(),
			registerValidatorKeys: jest.fn(),
			getValidatorKeys: jest.fn().mockResolvedValue({ generatorKey: publicKey }),
			getGeneratorsBetweenTimestamps: jest.fn(),
			setValidatorsParams: jest.fn(),
		};
		pomCommand.addDependencies({
			tokenMethod: mockTokenMethod,
			validatorsMethod: mockValidatorsMethod,
		});
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		delegateSubstore = dpos.stores.get(DelegateStore);

		misBehavingDelegate = { name: 'misBehavingDelegate', ...defaultDelegateInfo };
		normalDelegate = { name: 'normalDelegate', ...defaultDelegateInfo };

		const { id: id1, ...fakeBlockHeader1 } = testing
			.createFakeBlockHeader({
				generatorAddress: delegate1Address,
			})
			.toObject();
		const { id: id2, ...fakeBlockHeader2 } = testing
			.createFakeBlockHeader({
				generatorAddress: delegate1Address,
			})
			.toObject();

		header1 = fakeBlockHeader1 as BlockHeader;
		header2 = fakeBlockHeader2 as BlockHeader;

		pomCommand.init({
			governanceTokenID: DEFAULT_LOCAL_ID,
		});
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		transaction = new Transaction({
			module: 'dpos',
			command: 'reportDelegateMisbehavior',
			senderPublicKey: publicKey,
			nonce: BigInt(0),
			fee: BigInt(100000000),
			params: Buffer.alloc(0),
			signatures: [publicKey],
		});

		await delegateSubstore.set(createStoreGetter(stateStore), senderAddress, {
			name: 'mrrobot',
			totalVotesReceived: BigInt(10000000000),
			selfVotes: BigInt(1000000000),
			lastGeneratedHeight: 100,
			isBanned: false,
			pomHeights: [],
			consecutiveMissedBlocks: 0,
			commission: 0,
			lastCommissionIncreaseHeight: 0,
			sharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
		});
		await delegateSubstore.set(createStoreGetter(stateStore), delegate1Address, normalDelegate);
		await delegateSubstore.set(
			createStoreGetter(stateStore),
			delegate1Address,
			misBehavingDelegate,
		);
	});

	describe('constructor', () => {
		it('should have valid name', () => {
			expect(pomCommand.name).toEqual('reportDelegateMisbehavior');
		});

		it('should have valid schema', () => {
			expect(pomCommand.schema).toMatchSnapshot();
		});
	});

	describe('verify', () => {
		it('should throw error when generatorPublicKey does not match', async () => {
			transactionParamsDecoded = {
				header1: codec.encode(blockHeaderSchema, {
					...header1,
				}),
				header2: codec.encode(blockHeaderSchema, {
					...header2,
					generatorAddress: utils.getRandomBytes(20),
				}),
			};
			transactionParams = codec.encode(pomCommand.schema, transactionParamsDecoded);
			transaction.params = transactionParams;
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
				})
				.createCommandExecuteContext<PomTransactionParams>(pomCommand.schema);

			await expect(pomCommand.verify(context)).resolves.toHaveProperty(
				'error.message',
				'BlockHeaders are not contradicting as per BFT violation rules.',
			);
		});

		it('should throw error when header1 cannot be decoded', async () => {
			transactionParamsDecoded = {
				header1: utils.getRandomBytes(32),
				header2: codec.encode(blockHeaderSchema, { ...header2 }),
			};
			transactionParams = codec.encode(pomCommand.schema, transactionParamsDecoded);
			transaction.params = transactionParams;
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
				})
				.createCommandExecuteContext<PomTransactionParams>(pomCommand.schema);

			await expect(pomCommand.verify(context)).rejects.toThrow();
		});

		it('should throw error when header2 cannot be decoded', async () => {
			transactionParamsDecoded = {
				header1: codec.encode(blockHeaderSchema, { ...header1 }),
				header2: utils.getRandomBytes(32),
			};
			transactionParams = codec.encode(pomCommand.schema, transactionParamsDecoded);
			transaction.params = transactionParams;
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
				})
				.createCommandExecuteContext<PomTransactionParams>(pomCommand.schema);

			await expect(pomCommand.verify(context)).rejects.toThrow();
		});

		it('should resolve with error when headers are not contradicting', async () => {
			transactionParamsDecoded = {
				header1: codec.encode(blockHeaderSchema, {
					...header1,
				}),
				header2: codec.encode(blockHeaderSchema, {
					...header2,
					generatorAddress: utils.getRandomBytes(20),
				}),
			};
			transactionParams = codec.encode(pomCommand.schema, transactionParamsDecoded);
			transaction.params = transactionParams;
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
				})
				.createCommandExecuteContext<PomTransactionParams>(pomCommand.schema);

			await expect(pomCommand.verify(context)).resolves.toHaveProperty(
				'error.message',
				'BlockHeaders are not contradicting as per BFT violation rules.',
			);
		});

		it('should resolve without error when headers are valid, can be decoded and are contradicting', async () => {
			transactionParamsDecoded = {
				header1: codec.encode(blockHeaderSchema, {
					...header1,
				}),
				header2: codec.encode(blockHeaderSchema, { ...header2 }),
			};
			transactionParams = codec.encode(pomCommand.schema, transactionParamsDecoded);
			transaction.params = transactionParams;
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
				})
				.createCommandExecuteContext<PomTransactionParams>(pomCommand.schema);

			jest.spyOn(bftUtil, 'areDistinctHeadersContradicting').mockReturnValue(true);

			await expect(pomCommand.verify(context)).resolves.toHaveProperty('status', VerifyStatus.OK);
		});

		it('should not throw error when first height is equal to second height but equal maxHeightPrevoted', async () => {
			transactionParamsDecoded = {
				header1: codec.encode(blockHeaderSchema, {
					...header1,
					height: 10999,
					asset: { ...header1, maxHeightPrevoted: 1099 },
				}),
				header2: codec.encode(blockHeaderSchema, { ...header2, height: 10999 }),
			};
			transactionParams = codec.encode(pomCommand.schema, transactionParamsDecoded);
			transaction.params = transactionParams;
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
				})
				.createCommandExecuteContext<PomTransactionParams>(pomCommand.schema);

			await expect(pomCommand.verify(context)).not.toReject();
		});

		it('should not throw error when first height is greater than the second height but equal maxHeightPrevoted', async () => {
			transactionParamsDecoded = {
				header1: codec.encode(blockHeaderSchema, {
					...header1,
					height: 10999,
					asset: { ...header1, maxHeightPrevoted: 1099 },
				}),
				header2: codec.encode(blockHeaderSchema, { ...header2, height: 11999 }),
			};
			transactionParams = codec.encode(pomCommand.schema, transactionParamsDecoded);
			transaction.params = transactionParams;
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
				})
				.createCommandExecuteContext<PomTransactionParams>(pomCommand.schema);

			await expect(pomCommand.verify(context)).not.toReject();
		});

		it("should not throw error when height is greater than the second header's maxHeightPreviouslyForged", async () => {
			transactionParamsDecoded = {
				header1: codec.encode(blockHeaderSchema, {
					...header1,
					height: 120,
				}),
				header2: codec.encode(blockHeaderSchema, {
					...header2,
					height: 123,
					asset: { ...header1, maxHeightPreviouslyForged: 98 },
				}),
			};
			transactionParams = codec.encode(pomCommand.schema, transactionParamsDecoded);
			transaction.params = transactionParams;
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
				})
				.createCommandExecuteContext<PomTransactionParams>(pomCommand.schema);

			await expect(pomCommand.verify(context)).not.toReject();
		});

		it('should not throw error when maxHeightPrevoted is greater than the second maxHeightPrevoted', async () => {
			transactionParamsDecoded = {
				header1: codec.encode(blockHeaderSchema, {
					...header1,
					height: 133,
					asset: { ...header1, maxHeightPrevoted: 101 },
				}),
				header2: codec.encode(blockHeaderSchema, {
					...header2,
					height: 123,
					asset: { ...header1, maxHeightPrevoted: 98 },
				}),
			};
			transactionParams = codec.encode(pomCommand.schema, transactionParamsDecoded);
			transaction.params = transactionParams;
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
				})
				.createCommandExecuteContext<PomTransactionParams>(pomCommand.schema);

			await expect(pomCommand.verify(context)).not.toReject();
		});
	});

	describe('execute', () => {
		const block1Height = blockHeight - 768;
		const block2Height = block1Height + 15;
		let transactionParamsPreDecoded: any;

		beforeEach(() => {
			jest.spyOn(BlockHeader.prototype, 'validateSignature').mockReturnValue(undefined);

			transactionParamsPreDecoded = {
				header1: { ...header1, height: block1Height },
				header2: { ...header2, height: block2Height },
			};
		});

		it('should not throw error with valid transactions', async () => {
			transactionParamsDecoded = {
				header1: codec.encode(blockHeaderSchema, transactionParamsPreDecoded.header1),
				header2: codec.encode(blockHeaderSchema, transactionParamsPreDecoded.header2),
			};
			transactionParams = codec.encode(pomCommand.schema, transactionParamsDecoded);
			transaction.params = transactionParams;
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header,
				})
				.createCommandExecuteContext<PomTransactionParams>(pomCommand.schema);

			await expect(pomCommand.execute(context)).resolves.toBeUndefined();
		});

		it('should throw error if |header1.height - h| >= 260000', async () => {
			transactionParamsDecoded = {
				header1: codec.encode(blockHeaderSchema, {
					...transactionParamsPreDecoded.header1,
					height: blockHeight - 260000,
				}),
				header2: codec.encode(blockHeaderSchema, transactionParamsPreDecoded.header2),
			};
			transactionParams = codec.encode(pomCommand.schema, transactionParamsDecoded);
			transaction.params = transactionParams;
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header,
				})
				.createCommandExecuteContext<PomTransactionParams>(pomCommand.schema);

			await expect(pomCommand.execute(context)).rejects.toThrow(
				'Difference between header1.height and current height must be less than 260000.',
			);
		});

		it('should throw error if |header2.height - h| >= 260000', async () => {
			transactionParamsDecoded = {
				header2: codec.encode(blockHeaderSchema, {
					...transactionParamsPreDecoded.header2,
					height: blockHeight - 260000,
				}),
				header1: codec.encode(blockHeaderSchema, transactionParamsPreDecoded.header1),
			};
			transactionParams = codec.encode(pomCommand.schema, transactionParamsDecoded);
			transaction.params = transactionParams;
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header,
				})
				.createCommandExecuteContext<PomTransactionParams>(pomCommand.schema);

			await expect(pomCommand.execute(context)).rejects.toThrow(
				'Difference between header2.height and current height must be less than 260000.',
			);
		});

		it('should throw error when header1 is not properly signed', async () => {
			transactionParamsDecoded = {
				header1: codec.encode(blockHeaderSchema, transactionParamsPreDecoded.header1),
				header2: codec.encode(blockHeaderSchema, transactionParamsPreDecoded.header2),
			};
			transactionParams = codec.encode(pomCommand.schema, transactionParamsDecoded);
			transaction.params = transactionParams;
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header,
				})
				.createCommandExecuteContext<PomTransactionParams>(pomCommand.schema);

			jest.spyOn(BlockHeader.prototype, 'validateSignature').mockImplementationOnce(() => {
				throw new Error('Invalid block signature for header 1');
			});
			jest.spyOn(BlockHeader.prototype, 'validateSignature').mockReturnValueOnce(undefined);

			await expect(pomCommand.execute(context)).rejects.toThrow(
				'Invalid block signature for header 1',
			);
		});

		it('should throw error when header2 is not properly signed', async () => {
			transactionParamsDecoded = {
				header1: codec.encode(blockHeaderSchema, transactionParamsPreDecoded.header1),
				header2: codec.encode(blockHeaderSchema, transactionParamsPreDecoded.header2),
			};
			transactionParams = codec.encode(pomCommand.schema, transactionParamsDecoded);
			transaction.params = transactionParams;
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header,
				})
				.createCommandExecuteContext<PomTransactionParams>(pomCommand.schema);

			jest.spyOn(BlockHeader.prototype, 'validateSignature').mockReturnValueOnce(undefined);
			jest.spyOn(BlockHeader.prototype, 'validateSignature').mockImplementationOnce(() => {
				throw new Error('Invalid block signature for header 2');
			});

			await expect(pomCommand.execute(context)).rejects.toThrow(
				'Invalid block signature for header 2',
			);
		});

		it('should throw error if misbehaving account is not a delegate', async () => {
			transactionParamsDecoded = {
				header1: codec.encode(blockHeaderSchema, {
					...transactionParamsPreDecoded.header1,
					generatorAddress: utils.getRandomBytes(32),
				}),
				header2: codec.encode(blockHeaderSchema, transactionParamsPreDecoded.header2),
			};
			transactionParams = codec.encode(pomCommand.schema, transactionParamsDecoded);
			transaction.params = transactionParams;
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header,
				})
				.createCommandExecuteContext<PomTransactionParams>(pomCommand.schema);

			await expect(pomCommand.execute(context)).rejects.toThrow();
		});

		it('should throw error if misbehaving account is already banned', async () => {
			const updatedDelegateAccount = objects.cloneDeep(misBehavingDelegate);
			updatedDelegateAccount.isBanned = true;
			await delegateSubstore.set(
				createStoreGetter(stateStore),
				delegate1Address,
				updatedDelegateAccount,
			);
			transactionParamsDecoded = {
				header1: codec.encode(blockHeaderSchema, transactionParamsPreDecoded.header1),
				header2: codec.encode(blockHeaderSchema, transactionParamsPreDecoded.header2),
			};
			transactionParams = codec.encode(pomCommand.schema, transactionParamsDecoded);
			transaction.params = transactionParams;
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header,
				})
				.createCommandExecuteContext<PomTransactionParams>(pomCommand.schema);

			await expect(pomCommand.execute(context)).rejects.toThrow(
				'Cannot apply proof-of-misbehavior. Delegate is already banned.',
			);
		});

		it('should throw error if misbehaving account is already punished at height h', async () => {
			const updatedDelegateAccount = objects.cloneDeep(misBehavingDelegate);
			updatedDelegateAccount.pomHeights = [
				(transactionParamsPreDecoded.header1.height as number) + 10,
			];
			await delegateSubstore.set(
				createStoreGetter(stateStore),
				delegate1Address,
				updatedDelegateAccount,
			);
			transactionParamsDecoded = {
				header1: codec.encode(blockHeaderSchema, transactionParamsPreDecoded.header1),
				header2: codec.encode(blockHeaderSchema, transactionParamsPreDecoded.header2),
			};
			transactionParams = codec.encode(pomCommand.schema, transactionParamsDecoded);
			transaction.params = transactionParams;
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header,
				})
				.createCommandExecuteContext<PomTransactionParams>(pomCommand.schema);

			await expect(pomCommand.execute(context)).rejects.toThrow(
				'Cannot apply proof-of-misbehavior. Delegate is already punished.',
			);
		});

		it('should reward the sender with 1 LSK if delegate has enough balance', async () => {
			const remainingBalance = reportPunishmentReward + BigInt('10000000000');

			transactionParamsDecoded = {
				header1: codec.encode(blockHeaderSchema, transactionParamsPreDecoded.header1),
				header2: codec.encode(blockHeaderSchema, transactionParamsPreDecoded.header2),
			};
			transactionParams = codec.encode(pomCommand.schema, transactionParamsDecoded);
			transaction.params = transactionParams;
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header,
				})
				.createCommandExecuteContext<PomTransactionParams>(pomCommand.schema);

			when(pomCommand['_tokenMethod'].getAvailableBalance as any)
				.calledWith(expect.anything(), delegate1Address, DEFAULT_LOCAL_ID)
				.mockResolvedValue(remainingBalance as never);

			await pomCommand.execute(context);

			expect(pomCommand['_tokenMethod'].transfer).toHaveBeenCalledWith(
				expect.anything(),
				delegate1Address,
				context.transaction.senderAddress,
				DEFAULT_LOCAL_ID,
				reportPunishmentReward,
			);
		});

		it('should not reward the sender if delegate does not has enough minimum remaining balance', async () => {
			const remainingBalance = BigInt(100);

			transactionParamsDecoded = {
				header1: codec.encode(blockHeaderSchema, transactionParamsPreDecoded.header1),
				header2: codec.encode(blockHeaderSchema, transactionParamsPreDecoded.header2),
			};
			transactionParams = codec.encode(pomCommand.schema, transactionParamsDecoded);
			transaction.params = transactionParams;
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header,
				})
				.createCommandExecuteContext<PomTransactionParams>(pomCommand.schema);

			when(pomCommand['_tokenMethod'].getAvailableBalance as any)
				.calledWith(expect.anything(), delegate1Address, DEFAULT_LOCAL_ID)
				.mockResolvedValue(remainingBalance as never);

			await pomCommand.execute(context);

			// If amount is zero, it should not call the transfer
			expect(pomCommand['_tokenMethod'].transfer).not.toHaveBeenCalledWith(
				expect.anything(),
				delegate1Address,
				context.transaction.senderAddress,
				DEFAULT_LOCAL_ID,
				BigInt(0),
			);
		});

		it('should add (remaining balance - min remaining balance) of delegate to balance of the sender if delegate balance is less than report punishment reward', async () => {
			const remainingBalance = reportPunishmentReward - BigInt(1);

			transactionParamsDecoded = {
				header1: codec.encode(blockHeaderSchema, transactionParamsPreDecoded.header1),
				header2: codec.encode(blockHeaderSchema, transactionParamsPreDecoded.header2),
			};
			transactionParams = codec.encode(pomCommand.schema, transactionParamsDecoded);
			transaction.params = transactionParams;
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header,
				})
				.createCommandExecuteContext<PomTransactionParams>(pomCommand.schema);

			when(pomCommand['_tokenMethod'].getAvailableBalance as any)
				.calledWith(expect.anything(), delegate1Address, DEFAULT_LOCAL_ID)
				.mockResolvedValue(remainingBalance as never);

			await pomCommand.execute(context);

			expect(pomCommand['_tokenMethod'].transfer).toHaveBeenCalledWith(
				expect.anything(),
				delegate1Address,
				context.transaction.senderAddress,
				DEFAULT_LOCAL_ID,
				remainingBalance,
			);
		});

		it('should append height h to pomHeights property of misbehaving account', async () => {
			transactionParamsDecoded = {
				header1: codec.encode(blockHeaderSchema, transactionParamsPreDecoded.header1),
				header2: codec.encode(blockHeaderSchema, transactionParamsPreDecoded.header2),
			};
			transactionParams = codec.encode(pomCommand.schema, transactionParamsDecoded);
			transaction.params = transactionParams;
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header,
				})
				.createCommandExecuteContext<PomTransactionParams>(pomCommand.schema);

			await pomCommand.execute(context);

			const updatedDelegate = await delegateSubstore.get(
				createStoreGetter(stateStore),
				delegate1Address,
			);

			expect(updatedDelegate.pomHeights).toEqual([blockHeight]);
		});

		it('should set isBanned property to true is pomHeights.length === 5', async () => {
			const pomHeights = [500, 1000, 2000, 4550];
			const updatedDelegateAccount = objects.cloneDeep(misBehavingDelegate);
			updatedDelegateAccount.pomHeights = objects.cloneDeep(pomHeights);
			updatedDelegateAccount.isBanned = false;
			await delegateSubstore.set(
				createStoreGetter(stateStore),
				delegate1Address,
				updatedDelegateAccount,
			);

			transactionParamsDecoded = {
				header1: codec.encode(blockHeaderSchema, transactionParamsPreDecoded.header1),
				header2: codec.encode(blockHeaderSchema, transactionParamsPreDecoded.header2),
			};
			transactionParams = codec.encode(pomCommand.schema, transactionParamsDecoded);
			transaction.params = transactionParams;
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header,
				})
				.createCommandExecuteContext<PomTransactionParams>(pomCommand.schema);

			await pomCommand.execute(context);

			const updatedDelegate = await delegateSubstore.get(
				createStoreGetter(stateStore),
				delegate1Address,
			);

			expect(updatedDelegate.pomHeights).toEqual([...pomHeights, blockHeight]);
			expect(updatedDelegate.pomHeights).toHaveLength(5);
			expect(updatedDelegate.isBanned).toBeTrue();
		});

		it('should not return balance if sender and delegate account are same', async () => {
			transaction = new Transaction({
				module: 'dpos',
				command: 'reportDelegateMisbehavior',
				senderPublicKey: delegate1PublicKey,
				nonce: BigInt(0),
				fee: BigInt(100000000),
				params: Buffer.alloc(0),
				signatures: [delegate1PublicKey],
			});

			transactionParamsDecoded = {
				header1: codec.encode(blockHeaderSchema, transactionParamsPreDecoded.header1),
				header2: codec.encode(blockHeaderSchema, transactionParamsPreDecoded.header2),
			};
			transactionParams = codec.encode(pomCommand.schema, transactionParamsDecoded);
			transaction.params = transactionParams;
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header,
				})
				.createCommandExecuteContext<PomTransactionParams>(pomCommand.schema);

			await expect(pomCommand.execute(context)).resolves.toBeUndefined();
		});
	});
});
