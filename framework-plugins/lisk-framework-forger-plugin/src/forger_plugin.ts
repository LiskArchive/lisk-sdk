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

import * as os from 'os';
import { Server } from 'http';
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
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
import {
	getDBInstance,
	getForgerInfo,
	getForgerSyncInfo,
	setForgerInfo,
	setForgerSyncInfo,
} from './db';
import * as config from './defaults';
import { Forger, Options, TransactionFees, Voters } from './types';
import { Webhooks } from './webhooks';

const BLOCKS_BATCH_TO_SYNC = 1000;

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

interface MissedBlocksByAddress {
	[key: string]: number;
}

interface ForgerReceivedVotes {
	[key: string]: Voters;
}

// eslint-disable-next-line
const packageJSON = require('../package.json');
const getBinaryAddress = (base64AddressStr: string) =>
	Buffer.from(base64AddressStr, 'base64').toString('binary');

export class ForgerPlugin extends BasePlugin {
	private _forgerPluginDB!: KVStore;
	private _server!: Server;
	private _app!: Express;
	private _channel!: BaseChannel;
	private _forgersList!: ReadonlyArray<Forger>;
	private _transactionFees!: TransactionFees;
	private _webhooks!: Webhooks;
	private _syncingWithNode!: boolean;

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

		// eslint-disable-next-line new-cap
		const { locale } = Intl.DateTimeFormat().resolvedOptions();

		this._webhooks = new Webhooks(
			{
				'User-Agent': `lisk-framework-forger-plugin/0.1.0 (${os.platform()} ${os.release()}; ${os.arch()} ${locale}.${
					process.env.LC_CTYPE ?? ''
				}) lisk-framework/${options.version}`,
			},
			options.webhook,
		);
		this._forgerPluginDB = await getDBInstance(options.dataPath);

		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		this._channel.once('app:ready', async () => {
			this._app = initApi(options, this._channel, this.codec, this._forgerPluginDB);

			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			this._webhooks.handleEvent({
				event: 'forger:node:start',
				timestamp: Date.now(),
				payload: { reason: 'Node started' },
			});

			// Fetch and set forger list from the app
			await this._setForgersList();

			// Fetch and set transactions fees
			await this._setTransactionFees();

			// Sync the information
			this._syncingWithNode = true;
			await this._syncForgerInfo();
			this._syncingWithNode = false;

			// Listen to new block and delete block events
			this._subscribeToChannel();

			// Start http server
			this._server = this._app.listen(options.port, '0.0.0.0');
		});

		// @TODO Fix me! due to the way unload works this event is never fired in time.
		this._channel.once('app:shutdown', () => {
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			this._webhooks.handleEvent({
				event: 'forger:node:stop',
				timestamp: Date.now(),
				payload: { reason: 'Node shutdown' },
			});
		});
	}

	public async unload(): Promise<void> {
		// eslint-disable-next-line consistent-return
		if (this._server !== undefined) {
			await new Promise((resolve, reject) => {
				this._server.close(err => {
					if (err) {
						reject(err);
						return;
					}
					resolve();
				});
			});
		}

		await this._forgerPluginDB.close();
	}

	private async _syncForgerInfo(): Promise<void> {
		const {
			header: { height: lastBlockHeight },
		} = this.codec.decodeBlock(await this._channel.invoke<string>('app:getLastBlock'));
		const { syncUptoHeight } = await getForgerSyncInfo(this._forgerPluginDB);

		if (syncUptoHeight === lastBlockHeight) {
			// No need to sync
			return;
		}

		let needleHeight: number;

		if (syncUptoHeight > lastBlockHeight) {
			// Clear all forging information we have and sync again
			await this._forgerPluginDB.clear();
			needleHeight = 1;
		} else {
			needleHeight = syncUptoHeight + 1;
		}

		// Sync in batch of 1000 blocks
		while (needleHeight <= lastBlockHeight) {
			const toHeight =
				needleHeight +
				(needleHeight + BLOCKS_BATCH_TO_SYNC <= lastBlockHeight
					? BLOCKS_BATCH_TO_SYNC
					: lastBlockHeight - needleHeight);

			const blocks = await this._channel.invoke<string[]>('app:getBlocksByHeightBetween', {
				from: needleHeight,
				to: toHeight,
			});

			// Reverse the blocks to get blocks from lower height to highest
			for (const block of blocks.reverse()) {
				await this._addForgerInfo(block);
			}

			needleHeight = toHeight + 1;
		}

		// Update height upto which plugin is synced
		await setForgerSyncInfo(this._forgerPluginDB, lastBlockHeight);
		// Try to sync again if more blocks forged meanwhile
		await this._syncForgerInfo();
	}

	private _subscribeToChannel(): void {
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		this._channel.subscribe('app:block:new', async (eventInfo: EventInfoObject) => {
			const { block } = eventInfo.data as Data;
			const {
				header: { height },
			} = this._getForgerHeaderAndPayloadInfo(block);

			await this._addForgerInfo(block);
			await setForgerSyncInfo(this._forgerPluginDB, height);
		});

		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		this._channel.subscribe('app:block:delete', async (eventInfo: EventInfoObject) => {
			const { block } = eventInfo.data as Data;
			const {
				header: { height },
			} = this._getForgerHeaderAndPayloadInfo(block);

			await this._revertForgerInfo(block);
			await setForgerSyncInfo(this._forgerPluginDB, height);
		});
	}

	private async _setForgersList(): Promise<void> {
		this._forgersList = await this._channel.invoke<Forger[]>('app:getForgingStatusOfAllDelegates');
	}

	private async _setTransactionFees(): Promise<void> {
		this._transactionFees = await this._channel.invoke<TransactionFees>('app:getTransactionsFees');
	}

	private _getForgerHeaderAndPayloadInfo(block: string): ForgerPayloadInfo {
		const { header, payload } = this.codec.decodeBlock(block);
		const forgerAddress = getAddressFromPublicKey(
			Buffer.from(header.generatorPublicKey, 'base64'),
		).toString('base64');
		const forgerAddressBinary = getBinaryAddress(forgerAddress);

		return {
			forgerAddress,
			forgerAddressBinary,
			header,
			payload,
		};
	}

	private async _addForgerInfo(encodedBlock: string): Promise<void> {
		const {
			forgerAddress,
			forgerAddressBinary,
			header: { reward, height },
			payload,
		} = this._getForgerHeaderAndPayloadInfo(encodedBlock);
		const forgerInfo = await getForgerInfo(this._forgerPluginDB, forgerAddressBinary);

		if (this._forgersList.find(forger => forger.address === forgerAddress)) {
			forgerInfo.totalProducedBlocks += 1;
			forgerInfo.totalReceivedRewards += BigInt(reward);
			forgerInfo.totalReceivedFees += this._getFee(payload, encodedBlock);
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			this._webhooks.handleEvent({
				event: 'forger:block:created',
				timestamp: Date.now(),
				payload: { reward, forgerAddress, height },
			});
			await setForgerInfo(this._forgerPluginDB, forgerAddressBinary, { ...forgerInfo });
		}

		await this._addVotesReceived(payload);
		await this._updateMissedBlock(encodedBlock);
	}

	private async _revertForgerInfo(encodedBlock: string): Promise<void> {
		const {
			forgerAddress,
			forgerAddressBinary,
			header: { reward },
			payload,
		} = this._getForgerHeaderAndPayloadInfo(encodedBlock);
		const forgerInfo = await getForgerInfo(this._forgerPluginDB, forgerAddressBinary);

		if (this._forgersList.find(forger => forger.address === forgerAddress)) {
			forgerInfo.totalProducedBlocks -= 1;
			forgerInfo.totalReceivedRewards -= BigInt(reward);
			forgerInfo.totalReceivedFees -= this._getFee(payload, encodedBlock);
			await setForgerInfo(this._forgerPluginDB, forgerAddressBinary, { ...forgerInfo });
		}

		await this._revertVotesReceived(payload);
	}

	private _getForgerReceivedVotes(payload: ReadonlyArray<TransactionJSON>): ForgerReceivedVotes {
		const forgerReceivedVotes: ForgerReceivedVotes = {};

		for (const trx of payload) {
			if (trx.type === VoteTransaction.TYPE) {
				const senderAddress = getAddressFromPublicKey(Buffer.from(trx.senderPublicKey, 'base64'));
				(trx.asset as Asset).votes.reduce((acc: ForgerReceivedVotes, curr) => {
					const registeredDelegateIndex = this._forgersList.findIndex(
						forger => forger.address === curr.delegateAddress,
					);
					if (registeredDelegateIndex !== -1) {
						acc[curr.delegateAddress] = {
							address: senderAddress,
							amount: BigInt(acc[curr.delegateAddress] || 0) + BigInt(curr.amount),
						};
					}
					return acc;
				}, forgerReceivedVotes);
			}
		}

		return forgerReceivedVotes;
	}

	private async _addVotesReceived(payload: ReadonlyArray<TransactionJSON>): Promise<void> {
		const forgerReceivedVotes = this._getForgerReceivedVotes(payload);

		for (const [delegateAddress, votesReceived] of Object.entries(forgerReceivedVotes)) {
			const forgerInfo = await getForgerInfo(
				this._forgerPluginDB,
				getBinaryAddress(delegateAddress),
			);

			const voterIndex = forgerInfo.votesReceived.findIndex(aVote =>
				aVote.address.equals(votesReceived.address),
			);
			if (voterIndex === -1) {
				forgerInfo.votesReceived.push(votesReceived);
			} else {
				forgerInfo.votesReceived[voterIndex].amount += votesReceived.amount;
			}
			await setForgerInfo(this._forgerPluginDB, getBinaryAddress(delegateAddress), forgerInfo);
		}
	}

	private async _revertVotesReceived(payload: ReadonlyArray<TransactionJSON>): Promise<void> {
		const forgerReceivedVotes = this._getForgerReceivedVotes(payload);

		for (const [delegateAddress, votesReceived] of Object.entries(forgerReceivedVotes)) {
			const forgerInfo = await getForgerInfo(
				this._forgerPluginDB,
				getBinaryAddress(delegateAddress),
			);
			const voterIndex = forgerInfo.votesReceived.findIndex(aVote =>
				aVote.address.equals(votesReceived.address),
			);

			forgerInfo.votesReceived[voterIndex].amount -= BigInt(votesReceived.amount);
			if (forgerInfo.votesReceived[voterIndex].amount === BigInt(0)) {
				forgerInfo.votesReceived.splice(voterIndex, 1);
			}
			await setForgerInfo(this._forgerPluginDB, getBinaryAddress(delegateAddress), forgerInfo);
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
			const forgersInfoForRound = await this._channel.invoke<
				readonly { address: string; nextForgingTime: number }[]
			>('app:getForgersInfoForActiveRound');
			const forgersRoundLength = forgersInfoForRound.length;
			const forgerIndex = forgersInfoForRound.findIndex(f => f.address === forgerAddress);

			const missedBlocksByAddress: MissedBlocksByAddress = {};

			for (let index = 0; index < missedBlocks; index += 1) {
				const rawIndex = (forgerIndex - 1 - index) % forgersRoundLength;
				const forgerRoundIndex = rawIndex >= 0 ? rawIndex : rawIndex + forgersRoundLength;
				const missedForgerInfo = forgersInfoForRound[forgerRoundIndex];

				missedBlocksByAddress[missedForgerInfo.address] =
					missedBlocksByAddress[missedForgerInfo.address] === undefined
						? 1
						: (missedBlocksByAddress[missedForgerInfo.address] += 1);
			}

			// Only emit event if block missed and the plugin is not syncing with the forging node
			if (!this._syncingWithNode) {
				// eslint-disable-next-line @typescript-eslint/no-floating-promises
				this._webhooks.handleEvent({
					event: 'forger:block:missed',
					timestamp: Date.now(),
					payload: { missedBlocksByAddress, height },
				});
			}
		}
	}
}
