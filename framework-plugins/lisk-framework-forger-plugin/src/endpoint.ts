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
import {
	BasePlugin,
	BasePluginEndpoint,
	PluginEndpointContext,
	db as liskDB,
	cryptography,
} from 'lisk-sdk';
import { getForgerInfo } from './db';
import { Forger } from './types';

interface Voter {
	readonly address: string;
	readonly username: string;
	readonly totalVotesReceived: string;
	readonly voters: {
		readonly address: string;
		readonly amount: string;
	}[];
}

interface ForgerInfo extends Forger {
	readonly username: string;
	readonly totalReceivedFees: string;
	readonly totalReceivedRewards: string;
	readonly totalProducedBlocks: number;
	readonly totalVotesReceived: string;
	readonly consecutiveMissedBlocks: number;
}

interface Delegate {
	name: string;
	totalVotesReceived: string;
	selfVotes: string;
	lastGeneratedHeight: number;
	isBanned: boolean;
	pomHeights: ReadonlyArray<number>;
	consecutiveMissedBlocks: number;
}

export class Endpoint extends BasePluginEndpoint {
	private _client!: BasePlugin['apiClient'];
	private _db!: liskDB.Database;

	public init(db: liskDB.Database, apiClient: BasePlugin['apiClient']) {
		this._db = db;
		this._client = apiClient;
	}

	public async getVoters(_context: PluginEndpointContext): Promise<Voter[]> {
		const forgersList = await this._client.invoke<Forger[]>('app_getForgingStatus');
		const forgerAccounts = [];
		for (const delegate of forgersList) {
			const res = await this._client.invoke<Delegate>('dpos_getDelegate', {
				address: delegate.address,
			});
			forgerAccounts.push({
				...res,
				address: delegate.address,
			});
		}

		const result: Voter[] = [];
		for (const account of forgerAccounts) {
			const forgerInfo = await getForgerInfo(
				this._db,
				Buffer.from(account.address, 'hex').toString('binary'),
			);

			result.push({
				address: account.address,
				username: account.name,
				totalVotesReceived: account.totalVotesReceived,
				voters: forgerInfo.votesReceived.map(vote => ({
					address: cryptography.address.getLisk32AddressFromAddress(vote.address),
					amount: vote.amount.toString(),
				})),
			});
		}

		return result;
	}

	public async getForgingInfo(_context: PluginEndpointContext): Promise<ForgerInfo[]> {
		const forgersList = await this._client.invoke<ReadonlyArray<Forger>>('app_getForgingStatus');
		const forgerAccounts = [];
		for (const delegate of forgersList) {
			const res = await this._client.invoke<Delegate>('dpos_getDelegate', {
				address: delegate.address,
			});
			forgerAccounts.push({
				...res,
				address: delegate.address,
			});
		}
		const data: ForgerInfo[] = [];
		for (const forgerAccount of forgerAccounts) {
			const forgerAddressBinary = Buffer.from(forgerAccount.address, 'hex').toString('binary');
			const forgerInfo = await getForgerInfo(this._db, forgerAddressBinary);
			const forger = forgersList.find(aForger => aForger.address === forgerAccount.address);

			if (forger) {
				data.push({
					...forger,
					username: forgerAccount.name,
					totalReceivedFees: forgerInfo.totalReceivedFees.toString(),
					totalReceivedRewards: forgerInfo.totalReceivedRewards.toString(),
					totalProducedBlocks: forgerInfo.totalProducedBlocks,
					totalVotesReceived: forgerAccount.totalVotesReceived,
					consecutiveMissedBlocks: forgerAccount.consecutiveMissedBlocks,
				});
			}
		}

		return data;
	}
}
