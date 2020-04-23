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

import * as randomUtils from '../utils/random';
import { Account } from '../../src';
import { accountDefaultValues } from '../../src/account';

describe('account', () => {
	const accountAddress1 = randomUtils.account().address;
	let defaultAccount: Account;

	beforeEach(() => {
		defaultAccount = Account.getDefaultAccount(accountAddress1);
	});

	describe('constructor', () => {
		it('should create an Account object with default values', () => {
			expect(defaultAccount).toBeInstanceOf(Account);
			expect(defaultAccount).toHaveProperty('balance');
			expect(defaultAccount).toHaveProperty('fees');
			expect(defaultAccount).toHaveProperty('rewards');
			expect(defaultAccount.balance).toEqual(
				BigInt(accountDefaultValues.balance),
			);
			expect(defaultAccount.totalVotesReceived).toEqual(
				BigInt(accountDefaultValues.totalVotesReceived),
			);
			expect(defaultAccount.fees).toEqual(BigInt(accountDefaultValues.fees));
			expect(defaultAccount.rewards).toEqual(
				BigInt(accountDefaultValues.rewards),
			);
			expect(defaultAccount.votes).toEqual([]);
			expect(defaultAccount.unlocking).toEqual([]);
			expect(defaultAccount.delegate).toEqual({
				lastForgedHeight: 0,
				consecutiveMissedBlocks: 0,
				isBanned: false,
				pomHeights: [],
			});
		});

		it('should create an Account object with supplied account object in the constructor', () => {
			const pomHeights = [1090, 1900, 2888];
			const mandatoryKeys = ['x', 'y'];
			const optionalKeys = ['z'];
			const accountJSON = {
				address: accountAddress1,
				publicKey: undefined,
				balance: '0',
				username: null,
				nonce: '0',
				producedBlocks: 0,
				fees: '0',
				rewards: '0',
				totalVotesReceived: '0',
				votes: [],
				unlocking: [],
				delegate: {
					lastForgedHeight: 0,
					consecutiveMissedBlocks: 0,
					isBanned: false,
					pomHeights,
				},
				asset: {},
				keys: {
					mandatoryKeys,
					optionalKeys,
					numberOfSignatures: 0,
				},
				missedBlocks: 0,
				isDelegate: 0,
			};
			const accountObj = new Account(accountJSON);

			// Check for delegate.pomHeights array
			accountObj.delegate.pomHeights.push(900);
			expect(accountObj.delegate.pomHeights).toIncludeAnyMembers([900]);
			// Make sure the original object's value is not modified
			expect(accountJSON.delegate.pomHeights).not.toIncludeAnyMembers([900]);

			// Check for keys.mandatoryKeys array
			accountObj.keys.mandatoryKeys.push('xx');
			expect(accountObj.keys.mandatoryKeys).toIncludeAnyMembers(['xx']);
			// Make sure the original object's value is not modified
			expect(accountJSON.keys.mandatoryKeys).not.toIncludeAnyMembers(['xx']);

			// Check for keys.optionalKeys array
			accountObj.keys.optionalKeys.push('zz');
			expect(accountObj.keys.optionalKeys).toIncludeAnyMembers(['zz']);
			// Make sure the original object's value is not modified
			expect(accountJSON.keys.optionalKeys).not.toIncludeAnyMembers(['zz']);

			// Check for votes array
			const voteObject = {
				delegateAddress: 'xx',
				amount: BigInt(100),
			};
			accountObj.votes.push(voteObject);
			expect(accountObj.votes).toIncludeAnyMembers([voteObject]);
			// Make sure the original object's value is not modified
			expect(accountJSON.votes).toEqual([]);

			// Check for unlocking array
			const unlockingObject = {
				delegateAddress: 'xx',
				amount: BigInt(100),
				unvoteHeight: 100,
			};
			accountObj.unlocking.push(unlockingObject);
			expect(accountObj.unlocking).toIncludeAnyMembers([unlockingObject]);
			// Make sure the original object's value is not modified
			expect(accountJSON.unlocking).toEqual([]);
		});
	});

	describe('getDefaultAccount', () => {
		const accountAddress = randomUtils.account().address;
		let accountObj: Account;
		it('should return an instance of Account class with default values for a given address', () => {
			accountObj = Account.getDefaultAccount(accountAddress);
			expect(accountObj).toBeObject();
			expect(accountObj).toHaveProperty('address');
			expect(accountObj.address).toEqual(accountAddress);
			expect(accountObj.balance).toEqual(BigInt('0'));
			expect(accountObj.fees).toEqual(BigInt('0'));
			expect(accountObj.rewards).toEqual(BigInt('0'));
			expect(accountObj.totalVotesReceived).toEqual(BigInt('0'));
			expect(accountObj.username).toBeNull();
			expect(accountObj.publicKey).toBeUndefined();
			expect(accountObj.isDelegate).toEqual(0);
			expect(accountObj.missedBlocks).toEqual(0);
			expect(accountObj.producedBlocks).toEqual(0);
			expect(accountObj.asset).toEqual({});
			expect(accountObj.keys).toEqual({
				mandatoryKeys: [],
				optionalKeys: [],
				numberOfSignatures: 0,
			});
			expect(accountObj.votes).toEqual([]);
			expect(accountObj.unlocking).toEqual([]);
			expect(accountObj.delegate).toEqual({
				lastForgedHeight: 0,
				consecutiveMissedBlocks: 0,
				isBanned: false,
				pomHeights: [],
			});
		});
	});

	describe('toJSON', () => {
		defaultAccount = Account.getDefaultAccount(accountAddress1);
		const accountJSON = defaultAccount.toJSON();

		it('should return default account JSON object with relevant types', () => {
			expect(accountJSON.address).toEqual(accountAddress1);
			expect(accountJSON.balance).toBeString();
			expect(accountJSON.fees).toBeString();
			expect(accountJSON.rewards).toBeString();
			expect(accountJSON.username).toBeNull();
			expect(accountJSON.publicKey).toBeUndefined();
			expect(accountJSON.isDelegate).toBeNumber();
			expect(accountJSON.missedBlocks).toBeNumber();
			expect(accountJSON.producedBlocks).toBeNumber();
			expect(accountJSON.asset).toBeObject();
			expect(accountJSON.keys?.mandatoryKeys).toBeArray();
			expect(accountJSON.keys?.optionalKeys).toBeArray();
			expect(accountJSON.keys?.numberOfSignatures).toBeNumber();
			expect(accountJSON.votes).toBeArray();
			expect(accountJSON.totalVotesReceived).toBeString();
			expect(accountJSON.unlocking).toBeArray();
			expect(accountJSON.delegate?.consecutiveMissedBlocks).toBeNumber();
			expect(accountJSON.delegate?.lastForgedHeight).toBeNumber();
			expect(accountJSON.delegate?.consecutiveMissedBlocks).toBeNumber();
			expect(accountJSON.delegate?.isBanned).toBeBoolean();
			expect(accountJSON.delegate?.pomHeights).toBeArray();
		});

		it('should return account JSON object with relevant values', () => {
			expect(accountJSON.address).toEqual(accountAddress1);
			expect(accountJSON.balance).toEqual('0');
			expect(accountJSON.fees).toEqual('0');
			expect(accountJSON.rewards).toEqual('0');
			expect(accountJSON.username).toBeNull();
			expect(accountJSON.publicKey).toBeUndefined();
			expect(accountJSON.isDelegate).toEqual(0);
			expect(accountJSON.missedBlocks).toEqual(0);
			expect(accountJSON.producedBlocks).toEqual(0);
			expect(accountJSON.totalVotesReceived).toEqual('0');
			expect(accountJSON.asset).toEqual({});
			expect(accountJSON.keys).toEqual({
				mandatoryKeys: [],
				optionalKeys: [],
				numberOfSignatures: 0,
			});
			expect(accountJSON.votes).toEqual([]);
			expect(accountJSON.unlocking).toEqual([]);
			expect(accountJSON.delegate).toEqual({
				lastForgedHeight: 0,
				consecutiveMissedBlocks: 0,
				isBanned: false,
				pomHeights: [],
			});
		});
	});
});
