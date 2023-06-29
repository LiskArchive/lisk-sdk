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

import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import { Database } from '@liskhq/lisk-db';
import {
	ActionsDefinition,
	BasePlugin,
	BaseChannel,
	EventsDefinition,
	PluginInfo,
	TransactionJSON,
	BlockHeaderJSON,
	GenesisConfig,
} from 'lisk-framework';
import { objects, dataStructures } from '@liskhq/lisk-utils';

import {
	getDBInstance,
	getForgerInfo,
	getForgerSyncInfo,
	setForgerInfo,
	setForgerSyncInfo,
} from './db';
import * as config from './defaults';
import { Forger, Options, TransactionFees, Voters } from './types';
import * as controllers from './controllers';

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
	forgerAddressBuffer: Buffer;
	forgerAddressBinary: string;
	header: BlockHeaderJSON;
	payload: readonly TransactionJSON[];
}

interface NodeInfo {
	genesisHeight: number;
	genesisConfig: GenesisConfig;
}

interface MissedBlocksByAddress {
	[key: string]: number;
}

interface ForgerReceivedVotes {
	[key: string]: Voters;
}

// eslint-disable-next-line
const packageJSON = require('../package.json');
const getBinaryAddress = (hexAddressStr: string) =>
	Buffer.from(hexAddressStr, 'hex').toString('binary');
const getAddressBuffer = (hexAddressStr: string) => Buffer.from(hexAddressStr, 'hex');

export class ForgerPlugin extends BasePlugin {
	private _forgerPluginDB!: Database;
	private _channel!: BaseChannel;
	private _forgersList!: dataStructures.BufferMap<boolean>;
	private _transactionFees!: TransactionFees;
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

	public get defaults(): object {
		return config.defaultConfig;
	}

	public get events(): EventsDefinition {
		return ['block:created', 'block:missed'];
	}

	public get actions(): ActionsDefinition {
		return {
			getVoters: async () =>
				controllers.voters.getVoters(this._channel, this.codec, this._forgerPluginDB),
			getForgingInfo: async () =>
				controllers.forgingInfo.getForgingInfo(this._channel, this.codec, this._forgerPluginDB),
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async load(channel: BaseChannel): Promise<void> {
		const options = objects.mergeDeep({}, config.defaultConfig.default, this.options) as Options;
		this._channel = channel;

		// TODO: https://github.com/LiskHQ/lisk-sdk/issues/6201
		// eslint-disable-next-line new-cap
		this._forgerPluginDB = await getDBInstance(options.dataPath);

		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		this._channel.once('app:ready', async () => {
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
		});
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async unload(): Promise<void> {
		this._forgerPluginDB.close();
	}

	private async _setForgersList(): Promise<void> {
		this._forgersList = new dataStructures.BufferMap<boolean>();
		const forgersList = await this._channel.invoke<Forger[]>('app:getForgingStatus');
		for (const { address, forging } of forgersList) {
			this._forgersList.set(Buffer.from(address, 'hex'), forging);
		}
	}

	private async _setTransactionFees(): Promise<void> {
		const { genesisConfig } = await this._channel.invoke<NodeInfo>('app:getNodeInfo');
		this._transactionFees = {
			minFeePerByte: genesisConfig.minFeePerByte,
			baseFees: genesisConfig.baseFees,
		};
	}

	private _getForgerHeaderAndPayloadInfo(block: string): ForgerPayloadInfo {
		const { header, payload } = this.codec.decodeBlock(block);
		const forgerAddress = getAddressFromPublicKey(
			Buffer.from(header.generatorPublicKey, 'hex'),
		).toString('hex');
		const forgerAddressBuffer = getAddressBuffer(forgerAddress);
		const forgerAddressBinary = getBinaryAddress(forgerAddress);

		return {
			forgerAddress,
			forgerAddressBuffer,
			forgerAddressBinary,
			header,
			payload,
		};
	}

	private async _syncForgerInfo(): Promise<void> {
		const {
			header: { height: lastBlockHeight },
		} = this.codec.decodeBlock(await this._channel.invoke<string>('app:getLastBlock'));
		const { syncUptoHeight } = await getForgerSyncInfo(this._forgerPluginDB);
		const { genesisHeight } = await this._channel.invoke<NodeInfo>('app:getNodeInfo');
		const forgerPluginSyncedHeight = syncUptoHeight === 0 ? genesisHeight : syncUptoHeight;

		if (forgerPluginSyncedHeight === lastBlockHeight) {
			// No need to sync
			return;
		}

		let needleHeight: number;

		if (forgerPluginSyncedHeight > lastBlockHeight) {
			// Clear all forging information we have and sync again
			await this._forgerPluginDB.clear();
			needleHeight = genesisHeight + 1;
		} else {
			needleHeight = forgerPluginSyncedHeight + 1;
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
				const forgerPayloadInfo = this._getForgerHeaderAndPayloadInfo(block);
				await this._addForgerInfo(block, forgerPayloadInfo);
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
		this._channel.subscribe('app:block:new', async (data?: Record<string, unknown>) => {
			const { block } = (data as unknown) as Data;
			const forgerPayloadInfo = this._getForgerHeaderAndPayloadInfo(block);
			const {
				header: { height },
			} = forgerPayloadInfo;

			await this._addForgerInfo(block, forgerPayloadInfo);
			await setForgerSyncInfo(this._forgerPluginDB, height);
		});

		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		this._channel.subscribe('app:block:delete', async (data?: Record<string, unknown>) => {
			const { block } = (data as unknown) as Data;
			const forgerPayloadInfo = this._getForgerHeaderAndPayloadInfo(block);
			const {
				header: { height },
			} = forgerPayloadInfo;

			await this._revertForgerInfo(block, forgerPayloadInfo);
			await setForgerSyncInfo(this._forgerPluginDB, height);
		});
	}

	private async _addForgerInfo(
		encodedBlock: string,
		forgerPayloadInfo: ForgerPayloadInfo,
	): Promise<void> {
		const {
			forgerAddress,
			forgerAddressBuffer,
			forgerAddressBinary,
			header: { reward, height },
			payload,
		} = forgerPayloadInfo;
		const forgerInfo = await getForgerInfo(this._forgerPluginDB, forgerAddressBinary);

		if (this._forgersList.has(forgerAddressBuffer)) {
			forgerInfo.totalProducedBlocks += 1;
			forgerInfo.totalReceivedRewards += BigInt(reward);
			forgerInfo.totalReceivedFees += this._getFee(payload, encodedBlock);

			this._channel.publish('forger:block:created', {
				reward,
				forgerAddress,
				height,
				timestamp: Date.now(),
			});
			await setForgerInfo(this._forgerPluginDB, forgerAddressBinary, { ...forgerInfo });
		}

		await this._addVotesReceived(payload);
		await this._updateMissedBlock(encodedBlock);
	}

	private async _revertForgerInfo(
		encodedBlock: string,
		forgerPayloadInfo: ForgerPayloadInfo,
	): Promise<void> {
		const {
			forgerAddressBuffer,
			forgerAddressBinary,
			header: { reward },
			payload,
		} = forgerPayloadInfo;
		const forgerInfo = await getForgerInfo(this._forgerPluginDB, forgerAddressBinary);

		if (this._forgersList.has(forgerAddressBuffer)) {
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
			if (trx.moduleID === 5 && trx.assetID === 1) {
				const senderAddress = getAddressFromPublicKey(Buffer.from(trx.senderPublicKey, 'hex'));
				(trx.asset as Asset).votes.reduce((acc: ForgerReceivedVotes, curr) => {
					if (
						this._forgersList.has(getAddressBuffer(curr.delegateAddress)) &&
						acc[curr.delegateAddress]
					) {
						acc[curr.delegateAddress].amount += BigInt(curr.amount);
					} else {
						acc[curr.delegateAddress] = {
							address: senderAddress,
							amount: BigInt(curr.amount),
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
				// Remove voter when amount becomes zero
				if (forgerInfo.votesReceived[voterIndex].amount === BigInt(0)) {
					forgerInfo.votesReceived.splice(voterIndex, 1);
				}
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

			if (voterIndex !== -1) {
				forgerInfo.votesReceived[voterIndex].amount -= BigInt(votesReceived.amount);
				// Remove voter when amount becomes zero
				if (forgerInfo.votesReceived[voterIndex].amount === BigInt(0)) {
					forgerInfo.votesReceived.splice(voterIndex, 1);
				}
				await setForgerInfo(this._forgerPluginDB, getBinaryAddress(delegateAddress), forgerInfo);
			}
		}
	}

	private _getFee(payload: ReadonlyArray<TransactionJSON>, block: string): bigint {
		const { payload: payloadBuffer } = this.codec.decodeRawBlock(block);
		let fee = BigInt(0);

		for (let index = 0; index < payload.length; index += 1) {
			const trx = payload[index];
			const baseFee =
				this._transactionFees.baseFees.find(
					bf => bf.moduleID === trx.moduleID && bf.assetID === trx.assetID,
				)?.baseFee ?? '0';
			const minFeeRequired =
				BigInt(baseFee) +
				BigInt(this._transactionFees.minFeePerByte) * BigInt(payloadBuffer[index].length);
			fee += BigInt(trx.fee) - minFeeRequired;
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
			const forgersInfo = await this._channel.invoke<
				readonly { address: string; nextForgingTime: number }[]
			>('app:getForgers');
			const forgersRoundLength = forgersInfo.length;
			const forgerIndex = forgersInfo.findIndex(f => f.address === forgerAddress);

			const missedBlocksByAddress: MissedBlocksByAddress = {};

			for (let index = 0; index < missedBlocks; index += 1) {
				const rawIndex = (forgerIndex - 1 - index) % forgersRoundLength;
				const forgerRoundIndex = rawIndex >= 0 ? rawIndex : rawIndex + forgersRoundLength;
				const missedForgerInfo = forgersInfo[forgerRoundIndex];

				missedBlocksByAddress[missedForgerInfo.address] =
					missedBlocksByAddress[missedForgerInfo.address] === undefined
						? 1
						: (missedBlocksByAddress[missedForgerInfo.address] += 1);
			}

			// Only emit event if block missed and the plugin is not syncing with the forging node
			if (!this._syncingWithNode) {
				this._channel.publish('forger:block:missed', {
					missedBlocksByAddress,
					height,
					timestamp: Date.now(),
				});
			}
		}
	}
}
