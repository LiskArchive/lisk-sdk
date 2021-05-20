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
import { validator } from '@liskhq/lisk-validator';
import { RegisterTransactionAsset } from '../../../../../src/modules/dpos/transaction_assets/register_transaction_asset';
import { ApplyAssetContext } from '../../../../../src/types';
import {
	RegisterTransactionAssetContext,
	DPoSModule,
	DPOSAccountProps,
} from '../../../../../src/modules/dpos';
import { CHAIN_STATE_DELEGATE_USERNAMES } from '../../../../../src/modules/dpos/constants';
import * as testing from '../../../../../src/testing';

const { StateStoreMock } = testing.mocks;

describe('RegisterTransactionAsset', () => {
	const lastBlockHeight = 200;
	let transactionAsset: RegisterTransactionAsset;
	let context: ApplyAssetContext<RegisterTransactionAssetContext>;
	let sender: any;
	let stateStoreMock: testing.mocks.StateStoreMock;

	beforeEach(() => {
		sender = testing.fixtures.createDefaultAccount<DPOSAccountProps>([DPoSModule], {});
		stateStoreMock = new StateStoreMock({
			accounts: [sender],
			lastBlockHeaders: [{ height: lastBlockHeight }] as any,
		});
		transactionAsset = new RegisterTransactionAsset();

		const asset = {
			username: 'delegate',
		};

		const transaction = {
			senderAddress: sender.address,
		} as any;

		context = testing.createApplyAssetContext({
			transaction,
			asset,
			stateStore: stateStoreMock,
		});

		jest.spyOn(stateStoreMock.account, 'get');
		jest.spyOn(stateStoreMock.account, 'set');
		jest.spyOn(stateStoreMock.chain, 'get');
		jest.spyOn(stateStoreMock.chain, 'set');
	});

	describe('constructor', () => {
		it('should have valid id', () => {
			expect(transactionAsset.id).toEqual(0);
		});

		it('should have valid name', () => {
			expect(transactionAsset.name).toEqual('registerDelegate');
		});

		it('should have valid schema', () => {
			expect(transactionAsset.schema).toMatchSnapshot();
		});
	});

	describe('#validate', () => {
		describe('schema validation', () => {
			it('should throw error when username is more than 20 characters', () => {
				const asset: RegisterTransactionAssetContext = { username: 'abchd1563890087376368' };

				const errors = validator.validate(transactionAsset.schema, asset);
				expect(errors).toHaveLength(1);
				expect(errors[0].message).toInclude('must NOT have more than 20 characters');
			});

			it('should throw error when username empty string', () => {
				const asset: RegisterTransactionAssetContext = { username: '' };

				const errors = validator.validate(transactionAsset.schema, asset);
				expect(errors).toHaveLength(1);
				expect(errors[0].message).toInclude('must NOT have fewer than 1 characters');
			});
		});

		it('should not throw error if valid username is provided', () => {
			// Arrange
			const asset: RegisterTransactionAssetContext = { username: 'obelisk' };

			// Act & Assert
			expect(() => transactionAsset.validate({ asset } as any)).not.toThrow(
				'The username is in unsupported format',
			);
		});

		it('should throw error when username includes capital letter', () => {
			// Arrange
			const asset: RegisterTransactionAssetContext = { username: 'Obelisk' };

			// Act & Assert
			expect(() => transactionAsset.validate({ asset } as any)).toThrow(
				'The username is in unsupported format',
			);
		});

		it('should throw error when username includes forbidden character', () => {
			// Arrange
			const asset: RegisterTransactionAssetContext = { username: 'obe^lis' };

			// Act & Assert
			expect(() => transactionAsset.validate({ asset } as any)).toThrowErrorMatchingSnapshot();
		});

		it('should throw error when username includes forbidden null character', () => {
			// Arrange
			const asset: RegisterTransactionAssetContext = { username: 'obe\0lisk' };

			// Act & Assert
			expect(() => transactionAsset.validate({ asset } as any)).toThrow(
				'The username is in unsupported format',
			);
		});

		it('should not throw error when username includes only integers', () => {
			// Arrange
			const asset: RegisterTransactionAssetContext = { username: '123456789987' };

			// Act & Assert
			expect(() => transactionAsset.validate({ asset } as any)).not.toThrow();
		});

		it('should not throw error when username looks like legacy account address', () => {
			// Arrange
			const asset: RegisterTransactionAssetContext = { username: '123456789987l' };

			// Act & Assert
			expect(() => transactionAsset.validate({ asset } as any)).not.toThrow();
		});

		it.each(['!', '@', '$', '&', '_', '.'])(
			'should not throw error when username includes whitelisted special character "%s"',
			(character: string) => {
				// Arrange
				const asset: RegisterTransactionAssetContext = { username: `obe${character}lisk` };

				// Act & Assert
				expect(() => transactionAsset.validate({ asset } as any)).not.toThrow();
			},
		);

		it.each(['%', '#', ')', '(', '-', ' '])(
			'should throw error when username includes non-whitelisted special character "%s"',
			(character: string) => {
				// Arrange
				const asset: RegisterTransactionAssetContext = { username: `obe${character}lisk` };

				// Act & Assert
				expect(() => transactionAsset.validate({ asset } as any)).toThrow(
					'The username is in unsupported format',
				);
			},
		);
	});

	describe('#apply', () => {
		it('should call state store', async () => {
			// Act
			await transactionAsset.apply(context);

			// Assert
			expect(stateStoreMock.account.get).toHaveBeenCalledWith(context.transaction.senderAddress);
			expect(stateStoreMock.account.set).toHaveBeenCalledWith(sender.address, {
				...sender,
				dpos: {
					...sender.dpos,
					delegate: {
						...sender.dpos.delegate,
						username: context.asset.username,
						lastForgedHeight: lastBlockHeight + 1,
					},
				},
			});
		});

		it('should not throw errors', async () => {
			// Act
			await stateStoreMock.account.set(
				sender.address,
				testing.fixtures.createDefaultAccount<DPOSAccountProps>([DPoSModule], {
					address: sender.address,
				}),
			);

			// Act & Assert
			await expect(transactionAsset.apply(context)).resolves.toBeUndefined();
		});

		it('should throw error when username is taken', async () => {
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

			const secondAccount = testing.fixtures.createDefaultAccount<DPOSAccountProps>([DPoSModule], {
				dpos: { delegate: { username: 'myuser' } },
			});
			await stateStoreMock.account.set(secondAccount.address, secondAccount);
			context.asset = { username: 'myuser' };

			await stateStoreMock.chain.set(
				CHAIN_STATE_DELEGATE_USERNAMES,
				codec.encode(delegatesUserNamesSchema, {
					registeredDelegates: [
						{
							username: context.asset.username,
							address: Buffer.from('random'),
						},
					],
				}),
			);

			await expect(transactionAsset.apply(context)).rejects.toThrow(
				`Username ${context.asset.username} is already registered.`,
			);
		});

		it('should throw error when account is already delegate', async () => {
			const defaultVal = testing.fixtures.createDefaultAccount<DPOSAccountProps>([DPoSModule], {});
			await stateStoreMock.account.set(
				sender.address,
				testing.fixtures.createDefaultAccount([DPoSModule], {
					address: sender.address,
					dpos: {
						delegate: {
							...defaultVal.dpos.delegate,
							username: 'alreadydelegate',
						},
					},
				}),
			);

			await expect(transactionAsset.apply(context)).rejects.toThrow(
				'Account is already a delegate',
			);
		});

		it('should set lastForgedHeight to the lastBlock height + 1', async () => {
			// Arrange
			await stateStoreMock.account.set(
				sender.address,
				testing.fixtures.createDefaultAccount([DPoSModule], { address: sender.address }),
			);

			// Act
			await transactionAsset.apply(context);

			// Assert
			const updatedSender = await stateStoreMock.account.get(sender.address);
			expect(updatedSender.dpos.delegate.lastForgedHeight).toEqual(lastBlockHeight + 1);
		});
	});
});
