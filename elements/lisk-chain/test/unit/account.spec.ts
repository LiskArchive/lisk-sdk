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
 */

import { Account } from '../../src';
import { accountDefaultValues } from '../../src/account';
import { createFakeDefaultAccount, AccountAsset } from '../utils/account';

describe('account', () => {
	const accountAddress1 = createFakeDefaultAccount().address;
	let defaultAccount: Account<AccountAsset>;

	beforeEach(() => {
		const randomAccount = createFakeDefaultAccount();
		defaultAccount = Account.getDefaultAccount(randomAccount.address, randomAccount.asset);
	});

	describe('constructor', () => {
		it('should create an Account object with default values', () => {
			expect(defaultAccount).toBeInstanceOf(Account);
			expect(defaultAccount).toHaveProperty('balance');
			expect(defaultAccount).toHaveProperty('nonce');
			expect(defaultAccount.balance).toEqual(BigInt(accountDefaultValues.balance));
			expect(defaultAccount.asset.sentVotes).toEqual([]);
			expect(defaultAccount.asset.unlocking).toEqual([]);
			expect(defaultAccount.asset.delegate).toEqual({
				username: '',
				lastForgedHeight: 0,
				consecutiveMissedBlocks: 0,
				isBanned: false,
				pomHeights: [],
				totalVotesReceived: BigInt(0),
			});
		});

		it('should create an Account object with supplied account object in the constructor', () => {
			const pomHeights = [1090, 1900, 2888];
			const mandatoryKeys = [Buffer.from('x'), Buffer.from('y')];
			const optionalKeys = [Buffer.from('z')];
			const accountJSON = {
				address: accountAddress1,
				balance: BigInt('0'),
				nonce: BigInt('0'),
				keys: {
					mandatoryKeys,
					optionalKeys,
					numberOfSignatures: 0,
				},
				asset: {
					sentVotes: [],
					unlocking: [],
					delegate: {
						lastForgedHeight: 0,
						consecutiveMissedBlocks: 0,
						isBanned: false,
						pomHeights,
						totalVotesReceived: '0',
					},
				},
			};
			const accountObj = new Account(accountJSON);

			// Check for delegate.pomHeights array
			accountObj.asset.delegate.pomHeights.push(900);
			expect(accountObj.asset.delegate.pomHeights).toIncludeAnyMembers([900]);
			// Make sure the original object's value is not modified
			expect(accountJSON.asset.delegate.pomHeights).not.toIncludeAnyMembers([900]);

			// Check for keys.mandatoryKeys array
			accountObj.keys.mandatoryKeys.push(Buffer.from('xx'));
			expect(accountObj.keys.mandatoryKeys).toIncludeAnyMembers([Buffer.from('xx')]);
			// Make sure the original object's value is not modified
			expect(accountJSON.keys.mandatoryKeys).not.toIncludeAnyMembers([Buffer.from('xx')]);

			// Check for keys.optionalKeys array
			accountObj.keys.optionalKeys.push(Buffer.from('zz'));
			expect(accountObj.keys.optionalKeys).toIncludeAnyMembers([Buffer.from('zz')]);
			// Make sure the original object's value is not modified
			expect(accountJSON.keys.optionalKeys).not.toIncludeAnyMembers([Buffer.from('zz')]);

			// Check for votes array
			const voteObject = {
				delegateAddress: Buffer.from('xx'),
				amount: BigInt(100),
			};
			accountObj.asset.sentVotes.push(voteObject as never);
			expect(accountObj.asset.sentVotes).toIncludeAnyMembers([voteObject]);
			// Make sure the original object's value is not modified
			expect(accountJSON.asset.sentVotes).toEqual([]);

			// Check for unlocking array
			const unlockingObject = {
				delegateAddress: Buffer.from('xx'),
				amount: BigInt(100),
				unvoteHeight: 100,
			};
			accountObj.asset.unlocking.push(unlockingObject as never);
			expect(accountObj.asset.unlocking).toIncludeAnyMembers([unlockingObject]);
			// Make sure the original object's value is not modified
			expect(accountJSON.asset.unlocking).toEqual([]);
		});
	});

	describe('getDefaultAccount', () => {
		let accountObj: Account<AccountAsset>;
		it('should return an instance of Account class with default values for a given address', () => {
			const account = createFakeDefaultAccount();
			accountObj = Account.getDefaultAccount(account.address, account.asset);
			expect(accountObj).toBeObject();
			expect(accountObj).toHaveProperty('address');
			expect(accountObj.address).toEqual(account.address);
			expect(accountObj.balance).toEqual(BigInt('0'));
			expect(accountObj.keys).toEqual({
				mandatoryKeys: [],
				optionalKeys: [],
				numberOfSignatures: 0,
			});
			expect(accountObj.asset.sentVotes).toEqual([]);
			expect(accountObj.asset.unlocking).toEqual([]);
			expect(accountObj.asset.delegate).toEqual({
				username: '',
				lastForgedHeight: 0,
				consecutiveMissedBlocks: 0,
				isBanned: false,
				pomHeights: [],
				totalVotesReceived: BigInt(0),
			});
		});
	});
});
