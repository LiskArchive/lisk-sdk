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
 *
 */

import { when } from 'jest-when';
import { codec } from '@liskhq/lisk-codec';
import { Channel } from '../../src/types';
import { Account } from '../../src/account';

describe('account', () => {
	let channel: Channel;
	let account: Account;

	const sampleAccount = {
		address: Buffer.from('9d0149b0962d44bfc08a9f64d5afceb6281d7fb5', 'hex'),
		token: { balance: BigInt('0') },
	};

	const accountSchema = {
		$id: 'accountSchema',
		type: 'object',
		properties: {
			address: { dataType: 'bytes', fieldNumber: 1 },
			token: {
				type: 'object',
				fieldNumber: 2,
				properties: {
					balance: {
						fieldNumber: 1,
						dataType: 'uint64',
					},
				},
			},
		},
	};

	const encodedAccountBuffer = codec.encode(accountSchema, sampleAccount);
	const encodedAccountHex = encodedAccountBuffer.toString('hex');

	beforeEach(() => {
		channel = {
			connect: jest.fn(),
			disconnect: jest.fn(),
			invoke: jest.fn(),
			subscribe: jest.fn(),
		};
		account = new Account(channel, { account: accountSchema } as any);
	});

	describe('Account', () => {
		describe('constructor', () => {
			it('should initialize with channel', () => {
				expect(account['_channel']).toBe(channel);
			});
		});

		describe('get', () => {
			describe('account by address as buffer', () => {
				it('should invoke app:getAccount', async () => {
					// Arrange
					when(channel.invoke as any)
						.calledWith('app:getAccount', { address: '9d0149b0962d44bfc08a9f64d5afceb6281d7fb5' })
						.mockResolvedValue(encodedAccountHex as never);

					// Act
					const receivedAccount = await account.get(sampleAccount.address);

					// Assert
					expect(channel.invoke).toHaveBeenCalledTimes(1);
					expect(channel.invoke).toHaveBeenCalledWith('app:getAccount', {
						address: '9d0149b0962d44bfc08a9f64d5afceb6281d7fb5',
					});
					expect(receivedAccount).toEqual(sampleAccount);
				});
			});

			describe('account by address as hex', () => {
				it('should invoke app:getAccount', async () => {
					// Arrange
					when(channel.invoke as any)
						.calledWith('app:getAccount', { address: '9d0149b0962d44bfc08a9f64d5afceb6281d7fb5' })
						.mockResolvedValue(encodedAccountHex as never);

					// Act
					const receivedAccount = await account.get(sampleAccount.address.toString('hex'));

					// Assert
					expect(channel.invoke).toHaveBeenCalledTimes(1);
					expect(channel.invoke).toHaveBeenCalledWith('app:getAccount', {
						address: '9d0149b0962d44bfc08a9f64d5afceb6281d7fb5',
					});
					expect(receivedAccount).toEqual(sampleAccount);
				});
			});
		});

		describe('encode', () => {
			it('should return encoded account', () => {
				// Act
				const encodedAccount = account.encode(sampleAccount);
				// Assert
				expect(encodedAccount).toEqual(encodedAccountBuffer);
			});
		});

		describe('decode', () => {
			describe('account from input as buffer', () => {
				it('should return decoded account', () => {
					// Act
					const accountDecoded = account.decode(encodedAccountBuffer);
					// Assert
					expect(accountDecoded).toEqual(sampleAccount);
				});
			});

			describe('account from input as hex', () => {
				it('should return decoded account', () => {
					// Act
					const accountDecoded = account.decode(encodedAccountBuffer.toString('hex'));
					// Assert
					expect(accountDecoded).toEqual(sampleAccount);
				});
			});
		});

		describe('toJSON', () => {
			it('should return decoded account in JSON', () => {
				// Act
				const accountDecoded = account.decode(encodedAccountBuffer);
				const jsonAccount = account.toJSON(accountDecoded);
				// Assert
				expect(() => JSON.parse(JSON.stringify(jsonAccount))).not.toThrow();
			});
		});

		describe('fromJSON', () => {
			it('should return object from JSON account', () => {
				// Act
				const accountDecoded = account.decode(encodedAccountBuffer);
				const jsonAccount = account.toJSON(accountDecoded);
				const accountAsObject = account.fromJSON(jsonAccount);
				// Assert
				expect(Buffer.isBuffer(accountAsObject.address)).toBeTrue();
				expect(typeof (accountAsObject as any).token.balance).toBe('bigint');
			});
		});
	});
});
