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
	balance: '0',
	// tslint:disable-next-line no-null-keyword
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
		registeredHeight: 0,
		consecutiveMissedBlocks: 0,
		isBanned: false,
		pomHeights: [],
	},
	asset: {},
	keys: {
		mandatoryKeys: [],
		optionalKeys: [],
		numberOfSignatures: 0,
	},
	// TODO: Remove once new DPoS implementation is done
	missedBlocks: 0,
	voteWeight: '0',
	nameExist: false,
	votedDelegatesPublicKeys: [],
	isDelegate: 0,
};

interface Vote {
	readonly delegateAddress: string;
	readonly amount: bigint;
}

interface Unlocking {
	readonly delegateAddress: string;
	readonly amount: bigint;
	readonly unvoteHeight: number;
}

export class Account {
	public address: string;
	public balance: bigint;
	public nonce: bigint;
	public fees: bigint;
	public rewards: bigint;
	public producedBlocks: number;
	public publicKey: string | undefined;
	public totalVotesReceived: bigint;
	public username: string | null;
	public asset: object;
	public votes: Vote[];
	public unlocking: Unlocking[];
	public delegate: {
		lastForgedHeight: number;
		registeredHeight: number;
		consecutiveMissedBlocks: number;
		isBanned: boolean;
		pomHeights: number[];
	};
	public keys: {
		mandatoryKeys: string[];
		optionalKeys: string[];
		numberOfSignatures: number;
	};
	// TODO: Remove once new DPoS implementation is done
	public voteWeight: bigint;
	public missedBlocks: number;
	public isDelegate: number;
	public votedDelegatesPublicKeys: string[];
	public nameExist: boolean;

	public constructor(accountInfo: AccountJSON) {
		this.address = accountInfo.address;
		this.balance = accountInfo.balance
			? BigInt(accountInfo.balance)
			: BigInt(0);
		this.nonce = accountInfo.nonce ? BigInt(accountInfo.nonce) : BigInt(0);
		this.producedBlocks = accountInfo.producedBlocks;
		this.publicKey = accountInfo.publicKey;
		this.username = accountInfo.username;
		this.fees = accountInfo.fees ? BigInt(accountInfo.fees) : BigInt(0);
		this.rewards = accountInfo.rewards
			? BigInt(accountInfo.rewards)
			: BigInt(0);
		this.asset = accountInfo.asset;
		this.votes = accountInfo.votes?.length
			? accountInfo.votes.map(vote => ({
					delegateAddress: vote.delegateAddress,
					amount: BigInt(vote.amount),
			  }))
			: [];
		this.unlocking = accountInfo.unlocking?.length
			? accountInfo.unlocking.map(unlock => ({
					delegateAddress: unlock.delegateAddress,
					amount: BigInt(unlock.amount),
					unvoteHeight: unlock.unvoteHeight,
			  }))
			: [];
		this.totalVotesReceived = BigInt(accountInfo.totalVotesReceived ?? 0);
		this.delegate = {
			lastForgedHeight: accountInfo.delegate?.lastForgedHeight ?? 0,
			registeredHeight: accountInfo.delegate?.registeredHeight ?? 0,
			consecutiveMissedBlocks:
				accountInfo.delegate?.consecutiveMissedBlocks ?? 0,
			isBanned: accountInfo.delegate?.isBanned ?? false,
			pomHeights: accountInfo.delegate?.pomHeights ?? [],
		};
		this.keys = {
			mandatoryKeys: accountInfo.keys?.mandatoryKeys?.length
				? accountInfo.keys?.mandatoryKeys
				: [],
			optionalKeys: accountInfo.keys?.optionalKeys?.length
				? accountInfo.keys?.optionalKeys
				: [],
			numberOfSignatures: accountInfo.keys?.numberOfSignatures || 0,
		};

		// TODO: Remove once new DPoS implementation is done
		this.missedBlocks = accountInfo.missedBlocks;
		this.isDelegate = accountInfo.isDelegate;
		this.voteWeight = BigInt(accountInfo.voteWeight ?? 0);
		this.nameExist = accountInfo.nameExist;
		this.votedDelegatesPublicKeys =
			accountInfo.votedDelegatesPublicKeys === undefined ||
			accountInfo.votedDelegatesPublicKeys === null
				? []
				: accountInfo.votedDelegatesPublicKeys;
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
			balance: this.balance.toString(),
			nonce: this.nonce.toString(),
			producedBlocks: this.producedBlocks,
			fees: this.fees.toString(),
			rewards: this.rewards.toString(),
			totalVotesReceived: this.totalVotesReceived.toString(),
			asset: this.asset,
			votes: this.votes.map(v => ({
				delegateAddress: v.delegateAddress,
				amount: v.amount.toString(),
			})),
			unlocking: this.unlocking.map(v => ({
				delegateAddress: v.delegateAddress,
				amount: v.amount.toString(),
				unvoteHeight: v.unvoteHeight,
			})),
			delegate: {
				lastForgedHeight: this.delegate.lastForgedHeight,
				registeredHeight: this.delegate.registeredHeight,
				consecutiveMissedBlocks: this.delegate.consecutiveMissedBlocks,
				isBanned: this.delegate.isBanned,
				pomHeights: this.delegate.pomHeights,
			},
			keys: {
				mandatoryKeys: this.keys.mandatoryKeys,
				optionalKeys: this.keys.optionalKeys,
				numberOfSignatures: this.keys.numberOfSignatures,
			},
			// TODO: Remove once new DPoS implementation is done
			isDelegate: this.isDelegate,
			missedBlocks: this.missedBlocks,
			voteWeight: this.voteWeight.toString(),
			nameExist: this.nameExist,
			votedDelegatesPublicKeys:
				this.votedDelegatesPublicKeys.length < 1
					? // tslint:disable-next-line:no-null-keyword
					  null
					: this.votedDelegatesPublicKeys,
		};
	}
}
