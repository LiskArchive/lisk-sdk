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

import { Server } from 'http';
import * as Debug from 'debug';
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { KVStore } from '@liskhq/lisk-db';
import {
	ActionsDefinition,
	BasePlugin,
	BaseChannel,
	EventsArray,
	EventInfoObject,
	PluginInfo,
	TransactionJSON,
	BlockHeaderJSON,
} from 'lisk-framework';
import { VoteTransaction } from '@liskhq/lisk-transactions';
import { objects } from '@liskhq/lisk-utils';
import type { Express } from 'express';
import { initApi } from './api';
import { getDBInstance, getForgerSyncInfo } from './db';
import * as config from './defaults';
import { Forger, ForgerInfo, Options, TransactionFees } from './types';
import { DB_KEY_FORGER_INFO } from './constants';
import { forgerInfoSchema } from './schema';

interface Data {
	readonly block: string;
}

interface Asset {
	readonly votes: Array<Readonly<Vote>>;
}
interface Vote {
	delegateAddress: string;
	amount: string;
}

interface ForgerPayloadInfo {
	forgerAddress: string;
	forgerAddressBinary: string;
	header: BlockHeaderJSON;
	payload: readonly TransactionJSON[];
}

interface NodeInfo {
	genesisConfig: {
		readonly blockTime: number;
	};
}

// eslint-disable-next-line
const packageJSON = require('../package.json');
// eslint-disable-next-line new-cap
const debug = Debug('plugin:forger');

export class ForgerPlugin extends BasePlugin {
	private _forgerPluginDB!: KVStore;
	private _server!: Server;
	private _app!: Express;
	private _channel!: BaseChannel;
	private _forgersList!: ReadonlyArray<Forger>;
	private _transactionFees!: TransactionFees;

	// eslint-disable-next-line @typescript-eslint/class-literal-property-style
	public static get alias(): string {
		return 'forger';
	}

	// eslint-disable-next-line @typescript-eslint/class-literal-property-style
	public static get info(): PluginInfo {
		return {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			author: packageJSON.author,
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			version: packageJSON.version,
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			name: packageJSON.name,
		};
	}

	// eslint-disable-next-line class-methods-use-this
	public get defaults(): object {
		return config.defaultConfig;
	}

	// eslint-disable-next-line class-methods-use-this
	public get events(): EventsArray {
		return [];
	}

	// eslint-disable-next-line class-methods-use-this
	public get actions(): ActionsDefinition {
		return {};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async load(channel: BaseChannel): Promise<void> {
		const options = objects.mergeDeep({}, config.defaultConfig.default, this.options) as Options;
		this._channel = channel;

		this._forgerPluginDB = await getDBInstance(options.dataPath);

		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		this._channel.once('app:ready', async () => {
			this._app = initApi(options, this._channel, this.codec);

			// Fetch and set forger list from the app
			await this._setForgersList();

			// Fetch and set transactions fees
			await this._setTransactionFees();

			// Sync the information
			await this._syncForgerInfo();

			// Listen to new block and delete block events
			this._subscribeToChannel();

			// Start http server
			this._server = this._app.listen(options.port, '0.0.0.0');
		});
	}

	public async unload(): Promise<void> {
		await new Promise((resolve, reject) => {
			this._server.close(err => {
				if (err) {
					reject(err);
					return;
				}
				resolve();
			});
		});

		await this._forgerPluginDB.close();
	}

	private async _syncForgerInfo(): Promise<void> {
		const lastBlock = this.codec.decodeBlock(
			await this._channel.invoke<Buffer>('app:getLastBlock'),
		);
		const forgerSyncInfo = await getForgerSyncInfo(this._forgerPluginDB);

		if (forgerSyncInfo.syncUptoHeight === lastBlock.header.height) {
			// No need to sync
			return;
		}

		let syncFromHeight: number;

		if (forgerSyncInfo.syncUptoHeight > lastBlock.header.height) {
			await this._forgerPluginDB.clear();
			syncFromHeight = 1;
		} else {
			syncFromHeight = lastBlock.header.height + 1;
		}

		const blocks = await this._channel.invoke<string[]>('app: getBlocksByHeightBetween', {
			from: syncFromHeight,
			to: lastBlock.header.height,
		});

		for (const block of blocks) {
			await this._incrementForgerInfo(block);
		}

		// Try to sync again if more blocks forged meanwhile
		await this._syncForgerInfo();
	}

	private _subscribeToChannel(): void {
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		this._channel.subscribe('app:block:new', async (eventInfo: EventInfoObject) => {
			const { block } = eventInfo.data as Data;
			await this._incrementForgerInfo(block);
		});

		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		this._channel.subscribe('app:block:delete', async (eventInfo: EventInfoObject) => {
			const { block } = eventInfo.data as Data;
			await this._decrementForgerInfo(block);
		});
	}

	private async _setForgersList(): Promise<void> {
		this._forgersList = await this._channel.invoke<Forger[]>('app:getForgingStatusOfAllDelegates');
	}

	private async _getForgerInfo(forgerAddress: string): Promise<ForgerInfo> {
		let forgerInfo;
		try {
			forgerInfo = await this._forgerPluginDB.get(`${DB_KEY_FORGER_INFO}:${forgerAddress}`);
		} catch (error) {
			debug(`Forger info does not exists for delegate: ${forgerAddress}`);
			return {
				totalProducedBlocks: 0,
				totalMissedBlocks: 0,
				totalReceivedFees: BigInt(0),
				totalReceivedRewards: BigInt(0),
				votesReceived: [],
			};
		}

		return codec.decode<ForgerInfo>(forgerInfoSchema, forgerInfo);
	}

	private async _setForgerInfo(forgerAddress: string, forgerInfo: ForgerInfo): Promise<void> {
		const encodedForgerInfo = codec.encode(forgerInfoSchema, forgerInfo);
		await this._forgerPluginDB.put(`${DB_KEY_FORGER_INFO}:${forgerAddress}`, encodedForgerInfo);
	}

	private async _setTransactionFees(): Promise<void> {
		this._transactionFees = await this._channel.invoke<TransactionFees>('app:getTransactionsFees');
	}

	private _getForgerHeaderAndPayloadInfo(block: string): ForgerPayloadInfo {
		const { header, payload } = this.codec.decodeBlock(block);
		const forgerAddress = getAddressFromPublicKey(
			Buffer.from(header.generatorPublicKey, 'base64'),
		).toString('base64');
		const forgerAddressBuffer = Buffer.from(forgerAddress, 'base64');
		const forgerAddressBinary = forgerAddressBuffer.toString('binary');

		return {
			forgerAddress,
			forgerAddressBinary,
			header,
			payload,
		};
	}

	private async _incrementForgerInfo(encodedBlock: string): Promise<void> {
		const {
			forgerAddress,
			forgerAddressBinary,
			header: { reward },
			payload,
		} = this._getForgerHeaderAndPayloadInfo(encodedBlock);
		const forgerInfo = await this._getForgerInfo(forgerAddressBinary);
		let isUpdated = false;

		if (this._forgersList.find(forger => forger.address === forgerAddress)) {
			forgerInfo.totalProducedBlocks += 1;
			forgerInfo.totalReceivedRewards += BigInt(reward);
			forgerInfo.totalReceivedFees += this._getFee(payload, encodedBlock);
			isUpdated = true;
		}

		for (const trx of payload) {
			if (trx.type === VoteTransaction.TYPE) {
				for (const vote of (trx.asset as Asset).votes) {
					const registeredDelegateIndex = this._forgersList.findIndex(
						forger => forger.address === vote.delegateAddress,
					);
					if (registeredDelegateIndex !== -1) {
						const delegateVoteIndex = forgerInfo.votesReceived.findIndex(aVote =>
							aVote.address.equals(Buffer.from(vote.delegateAddress, 'base64')),
						);
						if (delegateVoteIndex === -1) {
							forgerInfo.votesReceived.push({
								address: Buffer.from(vote.delegateAddress, 'base64'),
								amount: BigInt(vote.amount),
							});
						} else {
							forgerInfo.votesReceived[delegateVoteIndex].amount += BigInt(vote.amount);
						}
						isUpdated = true;
					}
				}
			}
		}

		await this._updateMissedBlock(encodedBlock);

		if (isUpdated) {
			await this._setForgerInfo(forgerAddressBinary, { ...forgerInfo });
		}
	}

	private async _decrementForgerInfo(encodedBlock: string): Promise<void> {
		const {
			forgerAddress,
			forgerAddressBinary,
			header: { reward },
			payload,
		} = this._getForgerHeaderAndPayloadInfo(encodedBlock);
		const forgerInfo = await this._getForgerInfo(forgerAddressBinary);
		let isUpdated = false;

		if (this._forgersList.find(forger => forger.address === forgerAddress)) {
			forgerInfo.totalProducedBlocks -= 1;
			forgerInfo.totalReceivedRewards -= BigInt(reward);
			forgerInfo.totalReceivedFees -= this._getFee(payload, encodedBlock);
			isUpdated = true;
		}

		for (const trx of payload) {
			if (trx.type === VoteTransaction.TYPE) {
				for (const vote of (trx.asset as Asset).votes) {
					const delegateVoteIndex = forgerInfo.votesReceived.findIndex(aVote =>
						aVote.address.equals(Buffer.from(vote.delegateAddress, 'base64')),
					);
					if (delegateVoteIndex !== -1) {
						forgerInfo.votesReceived[delegateVoteIndex].amount -= BigInt(vote.amount);
						if (forgerInfo.votesReceived[delegateVoteIndex].amount === BigInt(0)) {
							forgerInfo.votesReceived.splice(delegateVoteIndex, 1);
						}
						isUpdated = true;
					}
				}
			}
		}

		if (isUpdated) {
			await this._setForgerInfo(forgerAddressBinary, { ...forgerInfo });
		}
	}

	private _getFee(payload: ReadonlyArray<TransactionJSON>, block: string): bigint {
		const { payload: payloadBuffer } = this.codec.decodeRawBlock(block);
		let fee = BigInt(0);

		for (let index = 0; index < payload.length; index += 1) {
			const trx = payload[index];
			fee +=
				BigInt(this._transactionFees[trx.type].baseFee) +
				BigInt(this._transactionFees[trx.type].minFeePerByte) * BigInt(payloadBuffer[index].length);
		}

		return fee;
	}

	private async _updateMissedBlock(block: string): Promise<void> {
		const {
			header: { height, timestamp },
			forgerAddress,
		} = this._getForgerHeaderAndPayloadInfo(block);
		const previousBlockStr = await this._channel.invoke<string>('app:getBlockByHeight', {
			height: height - 1,
		});
		const {
			genesisConfig: { blockTime },
		} = await this._channel.invoke<NodeInfo>('app:getNodeInfo');
		const { header: previousBlock } = this.codec.decodeBlock(previousBlockStr);
		const missedBlocks = Math.ceil((timestamp - previousBlock.timestamp) / blockTime) - 1;

		if (missedBlocks > 0) {
			const round = await this._channel.invoke('app:getSlotRound', { height });
			const forgerAddressForRound = await this._channel.invoke<readonly string[]>(
				'app:getForgerAddressesForRound',
				{ round },
			);
			const forgersRoundLength = forgerAddressForRound.length;
			const forgerIndex = forgerAddressForRound.findIndex(address => address === forgerAddress);

			for (let index = 0; index < missedBlocks; index += 1) {
				const rawIndex = (forgerIndex - 1 - index) % forgersRoundLength;
				const forgerRoundIndex = rawIndex >= 0 ? rawIndex : rawIndex + forgersRoundLength;
				const missedForgerAddress = forgerAddressForRound[forgerRoundIndex];
				const missedForger = await this._getForgerInfo(missedForgerAddress);
				missedForger.totalMissedBlocks += 1;
				await this._setForgerInfo(missedForgerAddress, missedForger);
			}
		}
	}
}
