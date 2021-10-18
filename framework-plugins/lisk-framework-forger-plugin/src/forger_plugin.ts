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

import {
	BasePlugin,
	BaseChannel,
	GenesisConfig,
	utils,
	codec,
	chain,
	db as liskDB,
	PluginInitContext,
} from 'lisk-sdk';
import {
	getDBInstance,
	getForgerInfo,
	getForgerSyncInfo,
	setForgerInfo,
	setForgerSyncInfo,
} from './db';
import { Forger, TransactionFees, Voters } from './types';
import { Endpoint } from './endpoint';

const { Block, blockSchema } = chain;
type BlockHeader = chain.BlockHeader;
type Transaction = chain.Transaction;

const BLOCKS_BATCH_TO_SYNC = 1000;
const MODULE_ID_DPOS = 5;
const COMMAND_ID_VOTE = 1;

interface Data {
	readonly block: string;
}

interface VotesParams {
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
	header: BlockHeader;
	payload: readonly Transaction[];
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

const getBinaryAddress = (hexAddressStr: string) =>
	Buffer.from(hexAddressStr, 'hex').toString('binary');
const getAddressBuffer = (hexAddressStr: string) => Buffer.from(hexAddressStr, 'hex');

export class ForgerPlugin extends BasePlugin {
	public name = 'forger';
	public endpoint = new Endpoint();

	private _forgerPluginDB!: liskDB.KVStore;
	private _channel!: BaseChannel;
	private _forgersList!: utils.dataStructures.BufferMap<boolean>;
	private _transactionFees!: TransactionFees;
	private _syncingWithNode!: boolean;

	public get nodeModulePath(): string {
		return __filename;
	}

	public get events(): string[] {
		return ['block:created', 'block:missed'];
	}

	public async init(context: PluginInitContext): Promise<void> {
		await super.init(context);
		this.endpoint.init(this._forgerPluginDB, this.apiClient);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async load(channel: BaseChannel): Promise<void> {
		this._channel = channel;

		// TODO: https://github.com/LiskHQ/lisk-sdk/issues/6201
		// eslint-disable-next-line new-cap
		this._forgerPluginDB = await getDBInstance(this.dataPath);

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
	}

	public async unload(): Promise<void> {
		await this._forgerPluginDB.close();
	}

	private async _setForgersList(): Promise<void> {
		this._forgersList = new utils.dataStructures.BufferMap<boolean>();
		const forgersList = await this._channel.invoke<Forger[]>('app_getForgingStatus');
		for (const { address, forging } of forgersList) {
			this._forgersList.set(Buffer.from(address, 'hex'), forging);
		}
	}

	private async _setTransactionFees(): Promise<void> {
		const { genesisConfig } = await this._channel.invoke<NodeInfo>('app_getNodeInfo');
		this._transactionFees = {
			minFeePerByte: genesisConfig.minFeePerByte,
			baseFees: genesisConfig.baseFees,
		};
	}

	private _getForgerHeaderAndPayloadInfo(blockBytes: string): ForgerPayloadInfo {
		const block = Block.fromBytes(Buffer.from(blockBytes, 'hex'));
		const forgerAddress = block.header.generatorAddress.toString('hex');
		const forgerAddressBuffer = getAddressBuffer(forgerAddress);
		const forgerAddressBinary = getBinaryAddress(forgerAddress);

		return {
			forgerAddress,
			forgerAddressBuffer,
			forgerAddressBinary,
			header: block.header,
			payload: block.payload,
		};
	}

	private async _syncForgerInfo(): Promise<void> {
		const lastBlockBytes = await this._channel.invoke<string>('app_getLastBlock');
		const {
			header: { height: lastBlockHeight },
		} = Block.fromBytes(Buffer.from(lastBlockBytes, 'hex'));
		const { syncUptoHeight } = await getForgerSyncInfo(this._forgerPluginDB);
		const { genesisHeight } = await this._channel.invoke<NodeInfo>('app_getNodeInfo');
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

			const blocks = await this._channel.invoke<string[]>('app_getBlocksByHeightBetween', {
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
		this._channel.subscribe('app_block:new', async (data?: Record<string, unknown>) => {
			const { block } = (data as unknown) as Data;
			const forgerPayloadInfo = this._getForgerHeaderAndPayloadInfo(block);
			const {
				header: { height },
			} = forgerPayloadInfo;

			await this._addForgerInfo(block, forgerPayloadInfo);
			await setForgerSyncInfo(this._forgerPluginDB, height);
		});

		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		this._channel.subscribe('app_block:delete', async (data?: Record<string, unknown>) => {
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
			header: { height },
			payload,
		} = forgerPayloadInfo;
		const forgerInfo = await getForgerInfo(this._forgerPluginDB, forgerAddressBinary);

		if (this._forgersList.has(forgerAddressBuffer)) {
			forgerInfo.totalProducedBlocks += 1;
			forgerInfo.totalReceivedFees += this._getFee(payload, encodedBlock);

			this._channel.publish('forger:block:created', {
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
		const { forgerAddressBuffer, forgerAddressBinary, payload } = forgerPayloadInfo;
		const forgerInfo = await getForgerInfo(this._forgerPluginDB, forgerAddressBinary);

		if (this._forgersList.has(forgerAddressBuffer)) {
			forgerInfo.totalProducedBlocks -= 1;
			forgerInfo.totalReceivedFees -= this._getFee(payload, encodedBlock);
			await setForgerInfo(this._forgerPluginDB, forgerAddressBinary, { ...forgerInfo });
		}

		await this._revertVotesReceived(payload);
	}

	private _getForgerReceivedVotes(payload: ReadonlyArray<Transaction>): ForgerReceivedVotes {
		const forgerReceivedVotes: ForgerReceivedVotes = {};

		const dposVotesSchema = this.apiClient.schemas.commands.find(
			c => c.moduleID === MODULE_ID_DPOS && c.commandID === COMMAND_ID_VOTE,
		);
		if (!dposVotesSchema) {
			throw new Error('DPoS votes command is not registered.');
		}

		for (const trx of payload) {
			if (trx.moduleID === MODULE_ID_DPOS && trx.commandID === COMMAND_ID_VOTE) {
				const params = codec.decode<VotesParams>(dposVotesSchema.schema, trx.params);
				params.votes.reduce((acc: ForgerReceivedVotes, curr) => {
					if (
						this._forgersList.has(getAddressBuffer(curr.delegateAddress)) &&
						acc[curr.delegateAddress]
					) {
						acc[curr.delegateAddress].amount += BigInt(curr.amount);
					} else {
						acc[curr.delegateAddress] = {
							address: trx.senderAddress,
							amount: BigInt(curr.amount),
						};
					}
					return acc;
				}, forgerReceivedVotes);
			}
		}

		return forgerReceivedVotes;
	}

	private async _addVotesReceived(payload: ReadonlyArray<Transaction>): Promise<void> {
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

	private async _revertVotesReceived(payload: ReadonlyArray<Transaction>): Promise<void> {
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

	private _getFee(payload: ReadonlyArray<Transaction>, block: string): bigint {
		const { payload: payloadBuffer } = codec.decode<{ payload: Buffer[] }>(
			blockSchema,
			Buffer.from(block),
		);
		let fee = BigInt(0);

		for (let index = 0; index < payload.length; index += 1) {
			const trx = payload[index];
			const baseFee =
				this._transactionFees.baseFees.find(
					bf => bf.moduleID === trx.moduleID && bf.commandID === trx.commandID,
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
		const previousBlockStr = await this._channel.invoke<string>('app_getBlockByHeight', {
			height: height - 1,
		});
		const {
			genesisConfig: { blockTime },
		} = await this._channel.invoke<NodeInfo>('app_getNodeInfo');
		const { header: previousBlock } = Block.fromBytes(Buffer.from(previousBlockStr, 'hex'));
		const missedBlocks = Math.ceil((timestamp - previousBlock.timestamp) / blockTime) - 1;

		if (missedBlocks > 0) {
			const forgersInfo = await this._channel.invoke<
				readonly { address: string; nextForgingTime: number }[]
			>('app_getForgers');
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
