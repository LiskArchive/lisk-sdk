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
import { AccountJSON } from './types';

export const accountDefaultValues = {
	publicKey: undefined,
	// tslint:disable-next-line:no-null-keyword
	username: null,
	isDelegate: 0,
	balance: '0',
	missedBlocks: 0,
	producedBlocks: 0,
	fees: '0',
	rewards: '0',
	voteWeight: '0',
	nameExist: false,
	// tslint:disable-next-line:no-null-keyword
	votedDelegatesPublicKeys: [],
	asset: {},
	keys: {
		mandatoryKeys: [],
		optionalKeys: [],
		numberOfSignatures: 0,
	},
};

export class Account {
	public address: string;
	public balance: bigint;
	public fees: bigint;
	public rewards: bigint;
	public voteWeight: bigint;
	public missedBlocks: number;
	public producedBlocks: number;
	public publicKey: string | undefined;
	public username: string | null;
	public isDelegate: number;
	public nameExist: boolean;
	public asset: object;
	public votedDelegatesPublicKeys: string[];
	public keys: {
		mandatoryKeys: string[];
		optionalKeys: string[];
		numberOfSignatures: number;
	};

	public constructor(accountInfo: AccountJSON) {
		this.address = accountInfo.address;
		this.balance = accountInfo.balance
			? BigInt(accountInfo.balance)
			: BigInt(0);
		this.missedBlocks = accountInfo.missedBlocks;
		this.producedBlocks = accountInfo.producedBlocks;
		this.isDelegate = accountInfo.isDelegate;
		this.publicKey = accountInfo.publicKey;
		this.username = accountInfo.username;
		this.fees = accountInfo.fees ? BigInt(accountInfo.fees) : BigInt(0);
		this.rewards = accountInfo.rewards
			? BigInt(accountInfo.rewards)
			: BigInt(0);
		this.voteWeight = accountInfo.voteWeight
			? BigInt(accountInfo.voteWeight)
			: BigInt(0);
		this.nameExist = accountInfo.nameExist;
		this.asset = accountInfo.asset;
		this.votedDelegatesPublicKeys =
			accountInfo.votedDelegatesPublicKeys === undefined ||
			accountInfo.votedDelegatesPublicKeys === null
				? []
				: accountInfo.votedDelegatesPublicKeys;
		this.keys = {
			mandatoryKeys: accountInfo.keys?.mandatoryKeys?.length
				? accountInfo.keys?.mandatoryKeys
				: [],
			optionalKeys: accountInfo.keys?.optionalKeys?.length
				? accountInfo.keys?.optionalKeys
				: [],
			numberOfSignatures: accountInfo.keys?.numberOfSignatures || 0,
		};
	}

	public static getDefaultAccount = (address: string): Account =>
		new Account({
			address,
			...accountDefaultValues,
		});

	public toJSON(): AccountJSON {
		return {
			address: this.address,
			publicKey: this.publicKey,
			// tslint:disable-next-line:no-null-keyword
			username: this.username,
			isDelegate: this.isDelegate,
			balance: this.balance.toString(),
			missedBlocks: this.missedBlocks,
			producedBlocks: this.producedBlocks,
			fees: this.fees.toString(),
			rewards: this.rewards.toString(),
			voteWeight: this.voteWeight.toString(),
			nameExist: this.nameExist,
			votedDelegatesPublicKeys:
				this.votedDelegatesPublicKeys.length < 1
					? // tslint:disable-next-line:no-null-keyword
					  null
					: this.votedDelegatesPublicKeys,
			asset: this.asset,
			keys: {
				mandatoryKeys: this.keys.mandatoryKeys,
				optionalKeys: this.keys.optionalKeys,
				numberOfSignatures: this.keys.numberOfSignatures,
			},
		};
	}
}
