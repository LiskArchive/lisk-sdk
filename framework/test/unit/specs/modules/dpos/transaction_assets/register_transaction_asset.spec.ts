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
import {
	RegisterTransactionAsset,
	RegisterTransactionAssetInput,
} from '../../../../../../src/modules/dpos/transaction_assets/register_transaction_asset';
import { ValidationError } from '../../../../../../src/errors';
import { ApplyAssetInput } from '../../../../../../src/types';
import { createAccount, createFakeDefaultAccount } from '../../../../../utils/node';
import { StateStoreMock } from '../../../../../utils/node/state_store_mock';

describe('RegisterTransactionAsset', () => {
	const lastBlockHeight = 200;
	let transactionAsset: RegisterTransactionAsset;
	let input: ApplyAssetInput<RegisterTransactionAssetInput>;
	let sender: any;
	let stateStoreMock: StateStoreMock;

	beforeEach(() => {
		sender = createFakeDefaultAccount(createAccount());
		stateStoreMock = new StateStoreMock([sender], {
			lastBlockHeaders: [{ height: lastBlockHeight }] as any,
		});
		transactionAsset = new RegisterTransactionAsset();
		input = {
			senderID: sender.address,
			asset: {
				username: 'delegate',
			},
			stateStore: stateStoreMock,
		} as any;

		jest.spyOn(stateStoreMock.account, 'get');
		jest.spyOn(stateStoreMock.account, 'set');
		jest.spyOn(stateStoreMock.chain, 'get');
		jest.spyOn(stateStoreMock.chain, 'set');
	});

	describe('constructor', () => {
		it('should have valid type', () => {
			expect(transactionAsset.type).toEqual(0);
		});

		it('should have valid name', () => {
			expect(transactionAsset.name).toEqual('register');
		});

		it('should have valid accountSchema', () => {
			expect(transactionAsset.assetSchema).toMatchSnapshot();
		});

		it('should have valid baseFee', () => {
			expect(transactionAsset.baseFee).toEqual(BigInt(1000000000));
		});
	});

	describe('#validateAsset', () => {
		it('should not throw error if valid username is provided', () => {
			// Arrange
			const asset: RegisterTransactionAssetInput = { username: 'obelisk' };
			const error = new ValidationError('The username is in unsupported format', 'obelisk');

			// Act & Assert
			expect(() => transactionAsset.validateAsset({ asset } as any)).not.toThrow(error);
		});

		it('should throw error when username includes capital letter', () => {
			// Arrange
			const asset: RegisterTransactionAssetInput = { username: 'Obelisk' };
			const error = new ValidationError('The username is in unsupported format', 'Obelisk');

			// Act & Assert
			expect(() => transactionAsset.validateAsset({ asset } as any)).toThrow(error);
		});

		it('should throw error when username is like address', () => {
			// Arrange
			const asset: RegisterTransactionAssetInput = { username: '17670127987160191762l' };
			const error = new ValidationError(
				'The username is in unsupported format',
				'17670127987160191762l',
			);

			// Act & Assert
			expect(() => transactionAsset.validateAsset({ asset } as any)).toThrow(error);
		});

		it('should throw error when username includes forbidden character', () => {
			// Arrange
			const asset: RegisterTransactionAssetInput = { username: 'obe^lis' };

			// Act & Assert
			expect(() => transactionAsset.validateAsset({ asset } as any)).toThrowErrorMatchingSnapshot();
		});

		it('should throw error when username includes forbidden null character', () => {
			// Arrange
			const asset: RegisterTransactionAssetInput = { username: 'obe\0lisk' };
			const error = new ValidationError('The username is in unsupported format', 'obe\0lisk');

			// Act & Assert
			expect(() => transactionAsset.validateAsset({ asset } as any)).toThrow(error);
		});
	});

	describe('#applyAsset', () => {
		it('should call state store', async () => {
			// Act
			await transactionAsset.applyAsset(input);

			// Assert
			expect(stateStoreMock.account.get).toHaveBeenCalledWith(input.senderID);
			expect(stateStoreMock.account.set).toHaveBeenCalledWith(sender.address, {
				...sender,
				dpos: {
					...sender.dpos,
					delegate: {
						...sender.dpos.delegate,
						username: input.asset.username,
					},
				},
			});
		});

		it('should not throw errors', async () => {
			// Act
			stateStoreMock.account.set(
				sender.address,
				createFakeDefaultAccount({ address: sender.address }),
			);

			// Act & Assert
			await expect(transactionAsset.applyAsset(input)).resolves.toBeUndefined();
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

			const secondAccount = createFakeDefaultAccount({ asset: { delegate: 'myuser' } });
			stateStoreMock.account.set(secondAccount.address, secondAccount);
			input.asset = { username: 'myuser' };

			stateStoreMock.chain.set(
				'delegateUsernames',
				codec.encode(delegatesUserNamesSchema, {
					registeredDelegates: [
						{
							username: input.asset.username,
							address: Buffer.from('random'),
						},
					],
				}),
			);

			await expect(transactionAsset.applyAsset(input)).rejects.toThrow('Username is not unique');
		});

		it('should throw error when account is already delegate', async () => {
			const defaultVal = createFakeDefaultAccount({});
			stateStoreMock.account.set(
				sender.address,
				createFakeDefaultAccount({
					address: sender.address,
					dpos: {
						delegate: {
							...defaultVal.dpos.delegate,
							username: 'alreadydelegate',
						},
					},
				}),
			);

			await expect(transactionAsset.applyAsset(input)).rejects.toThrow(
				'Account is already a delegate',
			);
		});

		it('should set lastForgedHeight to the lastBlock height + 1', async () => {
			// Arrange
			stateStoreMock.account.set(
				sender.address,
				createFakeDefaultAccount({ address: sender.address }),
			);

			// Act
			await transactionAsset.applyAsset(input);

			// Assert
			const updatedSender = (await stateStoreMock.account.get(sender.address)) as any;
			expect(updatedSender.dpos.delegate.lastForgedHeight).toEqual(lastBlockHeight + 1);
		});
	});
});
