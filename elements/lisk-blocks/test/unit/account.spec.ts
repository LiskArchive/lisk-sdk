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
			expect(defaultAccount).toHaveProperty('voteWeight');
			expect(defaultAccount).toHaveProperty('rewards');
			expect(defaultAccount.balance).toEqual(accountDefaultValues.balance);
			expect(defaultAccount.fees).toEqual(accountDefaultValues.fees);
			expect(defaultAccount.voteWeight).toEqual(
				accountDefaultValues.voteWeight,
			);
			expect(defaultAccount.rewards).toEqual(accountDefaultValues.rewards);
		});
	});

	describe('getDefaultAccount', () => {
		const accountAddress = randomUtils.account().address;
		let accountObj: Account;
		it('should return an instance of Account class with default values for a given address', () => {
			accountObj = Account.getDefaultAccount(accountAddress);
			expect(accountObj).toBeObject;
			expect(accountObj).toHaveProperty('address');
			expect(accountObj.address).toEqual(accountAddress);
			expect(accountObj.balance).toEqual(BigInt('0'));
			expect(accountObj.fees).toEqual(BigInt('0'));
			expect(accountObj.voteWeight).toEqual(BigInt('0'));
			expect(accountObj.rewards).toEqual(BigInt('0'));
			expect(accountObj.votedDelegatesPublicKeys).toEqual([]);
			expect(accountObj.membersPublicKeys).toEqual([]);
			expect(accountObj.username).toBeNull;
			expect(accountObj.secondPublicKey).toBeNull;
			expect(accountObj.secondSignature).toEqual(0);
			expect(accountObj.publicKey).toEqual(undefined);
			expect(accountObj.isDelegate).toEqual(0);
			expect(accountObj.missedBlocks).toEqual(0);
			expect(accountObj.producedBlocks).toEqual(0);
			expect(accountObj.nameExist).toEqual(false);
			expect(accountObj.multiMin).toEqual(0);
			expect(accountObj.multiLifetime).toEqual(0);
			expect(accountObj.asset).toEqual({});
		});
	});

	describe('getAccountJSON', () => {
		defaultAccount = Account.getDefaultAccount(accountAddress1);
		const accountJSON = defaultAccount.getAccountJSON();
		it('should return default account JSON object with relevant types', () => {
			expect(accountJSON.address).toEqual(accountAddress1);
			expect(accountJSON.balance).toBeString;
			expect(accountJSON.fees).toBeString;
			expect(accountJSON.voteWeight).toBeString;
			expect(accountJSON.rewards).toBeString;
			expect(accountJSON.votedDelegatesPublicKeys).toBeNull;
			expect(accountJSON.membersPublicKeys).toBeNull;
			expect(accountJSON.username).toBeNull;
			expect(accountJSON.secondPublicKey).toBeNull;
			expect(accountJSON.secondSignature).toBeNumber;
			expect(accountJSON.publicKey).toBeUndefined;
			expect(accountJSON.isDelegate).toBeNumber;
			expect(accountJSON.missedBlocks).toBeNumber;
			expect(accountJSON.producedBlocks).toBeNumber;
			expect(accountJSON.nameExist).toBeBoolean;
			expect(accountJSON.multiMin).toBeNumber;
			expect(accountJSON.multiLifetime).toBeNumber;
			expect(accountJSON.asset).toBeObject;
		});
		it('should return account JSON object with relevant values', () => {
			expect(accountJSON.address).toEqual(accountAddress1);
			expect(accountJSON.balance).toEqual('0');
			expect(accountJSON.fees).toEqual('0');
			expect(accountJSON.voteWeight).toEqual('0');
			expect(accountJSON.rewards).toEqual('0');
			expect(accountJSON.votedDelegatesPublicKeys).toEqual(null);
			expect(accountJSON.membersPublicKeys).toEqual(null);
			expect(accountJSON.username).toBeNull;
			expect(accountJSON.secondPublicKey).toBeNull;
			expect(accountJSON.secondSignature).toEqual(0);
			expect(accountJSON.publicKey).toEqual(undefined);
			expect(accountJSON.isDelegate).toEqual(0);
			expect(accountJSON.missedBlocks).toEqual(0);
			expect(accountJSON.producedBlocks).toEqual(0);
			expect(accountJSON.nameExist).toEqual(false);
			expect(accountJSON.multiMin).toEqual(0);
			expect(accountJSON.multiLifetime).toEqual(0);
			expect(accountJSON.asset).toEqual({});
		});
	});
});
