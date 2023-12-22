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

import { Plugins, Types, utils, codec, chain, db as liskDB, cryptography } from 'lisk-sdk';
import {
	getDBInstance,
	getForgerInfo,
	getForgerSyncInfo,
	setForgerInfo,
	setForgerSyncInfo,
} from './db';
import { Forger, Stakers } from './types';
import { Endpoint } from './endpoint';

type BlockHeaderJSON = chain.BlockHeaderJSON;
type BlockJSON = chain.BlockJSON;
type TransactionJSON = chain.TransactionJSON;

const BLOCKS_BATCH_TO_SYNC = 1000;
const MODULE_POS = 'pos';
const COMMAND_STAKE = 'stake';

interface Data {
	readonly blockHeader: BlockHeaderJSON;
}

interface StakesParams {
	readonly stakes: Array<Readonly<Stake>>;
}
interface Stake {
	validatorAddress: string;
	amount: string;
}

interface ForgerTransactionsInfo {
	forgerAddress: string;
	forgerAddressBuffer: Buffer;
	forgerAddressBinary: string;
	header: BlockHeaderJSON;
	transactions: TransactionJSON[];
}

interface NodeInfo {
	genesisHeight: number;
	genesis: Types.GenesisConfig;
}

interface MissedBlocksByAddress {
	[key: string]: number;
}

interface ForgerReceivedStakes {
	[key: string]: Stakers;
}

const getBinaryAddress = (hexAddressStr: string) =>
	Buffer.from(hexAddressStr, 'hex').toString('binary');
const getAddressBuffer = (hexAddressStr: string) => Buffer.from(hexAddressStr, 'hex');

export class ForgerPlugin extends Plugins.BasePlugin {
	public endpoint = new Endpoint();

	private _forgerPluginDB!: liskDB.Database;
	private _forgersList!: utils.dataStructures.BufferMap<boolean>;

	public get nodeModulePath(): string {
		return __filename;
	}

	public get events(): string[] {
		return ['block:created', 'block:missed'];
	}

	public async init(context: Plugins.PluginInitContext): Promise<void> {
		await super.init(context);
		this.endpoint.init(this._forgerPluginDB, this.apiClient);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async load(): Promise<void> {
		// TODO: https://github.com/LiskHQ/lisk-sdk/issues/6201
		this._forgerPluginDB = await getDBInstance(this.dataPath);

		// Fetch and set forger list from the app
		await this._setForgersList();

		// Sync the information
		await this._syncForgerInfo();

		// Listen to new block and delete block events
		this._subscribeToChannel();
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async unload(): Promise<void> {
		this._forgerPluginDB.close();
	}

	private async _setForgersList(): Promise<void> {
		this._forgersList = new utils.dataStructures.BufferMap<boolean>();
		const { status: forgersList } = await this.apiClient.invoke<{ status: Forger[] }>(
			'generator_getStatus',
		);
		for (const { address, forging } of forgersList) {
			this._forgersList.set(Buffer.from(address, 'hex'), forging);
		}
	}

	private _getForgerHeaderAndTransactionsInfo(
		header: BlockHeaderJSON,
		transactions: TransactionJSON[],
	): ForgerTransactionsInfo {
		const forgerAddress = header.generatorAddress;
		const forgerAddressBuffer = getAddressBuffer(forgerAddress);
		const forgerAddressBinary = getBinaryAddress(forgerAddress);

		return {
			forgerAddress,
			forgerAddressBuffer,
			forgerAddressBinary,
			header,
			transactions,
		};
	}

	private async _syncForgerInfo(): Promise<void> {
		const lastBlock = await this.apiClient.invoke<{ header: { height: number } }>(
			'chain_getLastBlock',
		);
		const {
			header: { height: lastBlockHeight },
		} = lastBlock;
		const { syncUptoHeight } = await getForgerSyncInfo(this._forgerPluginDB);
		const { genesisHeight } = await this.apiClient.invoke<NodeInfo>('system_getNodeInfo');
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

			const blocks = await this.apiClient.invoke<chain.BlockJSON[]>(
				'chain_getBlocksByHeightBetween',
				{
					from: needleHeight,
					to: toHeight,
				},
			);

			// Reverse the blocks to get blocks from lower height to highest
			for (const block of blocks.reverse()) {
				const forgerTransactionsInfo = this._getForgerHeaderAndTransactionsInfo(
					block.header,
					block.transactions,
				);
				await this._addForgerInfo(block.header, forgerTransactionsInfo);
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
		this.apiClient.subscribe('chain_newBlock', async (data?: Record<string, unknown>) => {
			const { blockHeader } = data as unknown as Data;
			const transactions = await this.apiClient.invoke<TransactionJSON[]>(
				'chain_getTransactionsByHeight',
				{ height: blockHeader.height },
			);
			const forgerTransactionsInfo = this._getForgerHeaderAndTransactionsInfo(
				blockHeader,
				transactions,
			);
			const {
				header: { height },
			} = forgerTransactionsInfo;

			await this._addForgerInfo(blockHeader, forgerTransactionsInfo);
			await setForgerSyncInfo(this._forgerPluginDB, height);
		});

		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		this.apiClient.subscribe('chain_deleteBlock', async (data?: Record<string, unknown>) => {
			const { blockHeader } = data as unknown as Data;
			const transactions = await this.apiClient.invoke<TransactionJSON[]>(
				'chain_getTransactionsByHeight',
				{ height: blockHeader.height },
			);
			const forgerTransactionsInfo = this._getForgerHeaderAndTransactionsInfo(
				blockHeader,
				transactions,
			);
			const {
				header: { height },
			} = forgerTransactionsInfo;

			await this._revertForgerInfo(forgerTransactionsInfo);
			await setForgerSyncInfo(this._forgerPluginDB, height);
		});
	}

	private async _addForgerInfo(
		header: BlockHeaderJSON,
		forgerTransactionsInfo: ForgerTransactionsInfo,
	): Promise<void> {
		const { forgerAddressBuffer, forgerAddressBinary, transactions } = forgerTransactionsInfo;
		const forgerInfo = await getForgerInfo(this._forgerPluginDB, forgerAddressBinary);

		if (this._forgersList.has(forgerAddressBuffer)) {
			forgerInfo.totalProducedBlocks += 1;
			forgerInfo.totalReceivedFees += this._getFee(transactions);

			await setForgerInfo(this._forgerPluginDB, forgerAddressBinary, { ...forgerInfo });
		}

		await this._addStakesReceived(transactions);
		await this._updateMissedBlock(header, transactions);
	}

	private async _revertForgerInfo(forgerTransactionsInfo: ForgerTransactionsInfo): Promise<void> {
		const { forgerAddressBuffer, forgerAddressBinary, transactions } = forgerTransactionsInfo;
		const forgerInfo = await getForgerInfo(this._forgerPluginDB, forgerAddressBinary);

		if (this._forgersList.has(forgerAddressBuffer)) {
			forgerInfo.totalProducedBlocks -= 1;
			forgerInfo.totalReceivedFees -= this._getFee(transactions);
			await setForgerInfo(this._forgerPluginDB, forgerAddressBinary, { ...forgerInfo });
		}

		await this._revertStakesReceived(transactions);
	}

	private _getForgerReceivedStakes(
		transactions: ReadonlyArray<TransactionJSON>,
	): ForgerReceivedStakes {
		const forgerReceivedStakes: ForgerReceivedStakes = {};

		const posModuleMeta = this.apiClient.metadata.find(c => c.name === MODULE_POS);
		if (!posModuleMeta) {
			throw new Error('PoS stakes command is not registered.');
		}
		const voteCommandMeta = posModuleMeta.commands.find(c => c.name === COMMAND_STAKE);
		if (!voteCommandMeta?.params) {
			throw new Error('PoS stakes command is not registered.');
		}

		for (const trx of transactions) {
			if (trx.module === MODULE_POS && trx.command === COMMAND_STAKE) {
				const params = codec.decode<StakesParams>(
					voteCommandMeta.params,
					Buffer.from(trx.params, 'hex'),
				);
				params.stakes.reduce((acc: ForgerReceivedStakes, curr) => {
					if (
						this._forgersList.has(getAddressBuffer(curr.validatorAddress)) &&
						acc[curr.validatorAddress]
					) {
						acc[curr.validatorAddress].amount += BigInt(curr.amount);
					} else {
						acc[curr.validatorAddress] = {
							address: cryptography.address.getAddressFromPublicKey(
								Buffer.from(trx.senderPublicKey, 'hex'),
							),
							amount: BigInt(curr.amount),
						};
					}
					return acc;
				}, forgerReceivedStakes);
			}
		}

		return forgerReceivedStakes;
	}

	private async _addStakesReceived(transactions: ReadonlyArray<TransactionJSON>): Promise<void> {
		const forgerReceivedStakes = this._getForgerReceivedStakes(transactions);

		for (const [validatorAddress, stakeReceived] of Object.entries(forgerReceivedStakes)) {
			const forgerInfo = await getForgerInfo(
				this._forgerPluginDB,
				getBinaryAddress(validatorAddress),
			);

			const stakerIndex = forgerInfo.stakeReceived.findIndex(aStake =>
				aStake.address.equals(stakeReceived.address),
			);
			if (stakerIndex === -1) {
				forgerInfo.stakeReceived.push(stakeReceived);
			} else {
				forgerInfo.stakeReceived[stakerIndex].amount += stakeReceived.amount;
				// Remove staker when amount becomes zero
				if (forgerInfo.stakeReceived[stakerIndex].amount === BigInt(0)) {
					forgerInfo.stakeReceived.splice(stakerIndex, 1);
				}
			}
			await setForgerInfo(this._forgerPluginDB, getBinaryAddress(validatorAddress), forgerInfo);
		}
	}

	private async _revertStakesReceived(transactions: ReadonlyArray<TransactionJSON>): Promise<void> {
		const forgerReceivedStakes = this._getForgerReceivedStakes(transactions);

		for (const [validatorAddress, stakeReceived] of Object.entries(forgerReceivedStakes)) {
			const forgerInfo = await getForgerInfo(
				this._forgerPluginDB,
				getBinaryAddress(validatorAddress),
			);
			const stakerIndex = forgerInfo.stakeReceived.findIndex(aStake =>
				aStake.address.equals(stakeReceived.address),
			);

			if (stakerIndex !== -1) {
				forgerInfo.stakeReceived[stakerIndex].amount -= BigInt(stakeReceived.amount);
				// Remove staker when amount becomes zero
				if (forgerInfo.stakeReceived[stakerIndex].amount === BigInt(0)) {
					forgerInfo.stakeReceived.splice(stakerIndex, 1);
				}
				await setForgerInfo(this._forgerPluginDB, getBinaryAddress(validatorAddress), forgerInfo);
			}
		}
	}

	private _getFee(transactions: ReadonlyArray<TransactionJSON>): bigint {
		let fee = BigInt(0);

		for (const txJSON of transactions) {
			const trx = chain.Transaction.fromJSON(txJSON);
			fee += BigInt(trx.fee);
		}

		return fee;
	}

	private async _updateMissedBlock(
		header: BlockHeaderJSON,
		transactions: TransactionJSON[],
	): Promise<void> {
		const {
			header: { height, timestamp },
			forgerAddress,
		} = this._getForgerHeaderAndTransactionsInfo(header, transactions);
		const previousBlock = await this.apiClient.invoke<BlockJSON>('chain_getBlockByHeight', {
			height: height - 1,
		});
		const {
			genesis: { blockTime },
		} = await this.apiClient.invoke<NodeInfo>('system_getNodeInfo');
		const missedBlocks = Math.ceil((timestamp - previousBlock.header.timestamp) / blockTime) - 1;

		if (missedBlocks > 0) {
			const { list: forgersInfo } = await this.apiClient.invoke<{ list: { address: string }[] }>(
				'chain_getGeneratorList',
			);
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
		}
	}
}
