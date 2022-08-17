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
	GenesisConfig,
	utils,
	codec,
	chain,
	db as liskDB,
	cryptography,
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

const { Block } = chain;
const { utils: cryptoUtils } = cryptography;
type BlockHeaderJSON = chain.BlockHeaderJSON;
type BlockJSON = chain.BlockJSON;
type TransactionJSON = chain.TransactionJSON;

const BLOCKS_BATCH_TO_SYNC = 1000;
const MODULE_ID_DPOS = 5;
const MODULE_ID_DPOS_BUFFER = cryptoUtils.intToBuffer(MODULE_ID_DPOS, 4);
const COMMAND_ID_VOTE = 1;
const COMMAND_ID_VOTE_BUFFER = cryptoUtils.intToBuffer(COMMAND_ID_VOTE, 4);

interface Data {
	readonly blockHeader: BlockHeaderJSON;
}

interface VotesParams {
	readonly votes: Array<Readonly<Vote>>;
}
interface Vote {
	delegateAddress: string;
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

	private _forgerPluginDB!: liskDB.Database;
	private _forgersList!: utils.dataStructures.BufferMap<boolean>;
	private _transactionFees!: TransactionFees;

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
	public async load(): Promise<void> {
		// TODO: https://github.com/LiskHQ/lisk-sdk/issues/6201
		this._forgerPluginDB = await getDBInstance(this.dataPath);

		// Fetch and set forger list from the app
		await this._setForgersList();

		// Fetch and set transactions fees
		await this._setTransactionFees();

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
		const forgersList = await this.apiClient.invoke<Forger[]>('generator_getForgingStatus');
		for (const { address, forging } of forgersList) {
			this._forgersList.set(Buffer.from(address, 'hex'), forging);
		}
	}

	private async _setTransactionFees(): Promise<void> {
		const { genesisConfig } = await this.apiClient.invoke<NodeInfo>('system_getNodeInfo');
		this._transactionFees = {
			minFeePerByte: genesisConfig.minFeePerByte,
		};
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
		const lastBlockBytes = await this.apiClient.invoke<string>('app_getLastBlock');
		const {
			header: { height: lastBlockHeight },
		} = Block.fromBytes(Buffer.from(lastBlockBytes, 'hex'));
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
			const { blockHeader } = (data as unknown) as Data;
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
			const { blockHeader } = (data as unknown) as Data;
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

		await this._addVotesReceived(transactions);
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

		await this._revertVotesReceived(transactions);
	}

	private _getForgerReceivedVotes(
		transactions: ReadonlyArray<TransactionJSON>,
	): ForgerReceivedVotes {
		const forgerReceivedVotes: ForgerReceivedVotes = {};

		const dposModuleMeta = this.apiClient.metadata.find(
			c => c.id === MODULE_ID_DPOS_BUFFER.toString('hex'),
		);
		if (!dposModuleMeta) {
			throw new Error('DPoS votes command is not registered.');
		}
		const voteCommandMeta = dposModuleMeta.commands.find(
			c => c.id === COMMAND_ID_VOTE_BUFFER.toString('hex'),
		);
		if (!voteCommandMeta || !voteCommandMeta.params) {
			throw new Error('DPoS votes command is not registered.');
		}

		for (const trx of transactions) {
			if (
				trx.moduleID === MODULE_ID_DPOS_BUFFER.toString('hex') &&
				trx.commandID === COMMAND_ID_VOTE_BUFFER.toString('hex')
			) {
				const params = codec.decode<VotesParams>(
					voteCommandMeta.params,
					Buffer.from(trx.params, 'hex'),
				);
				params.votes.reduce((acc: ForgerReceivedVotes, curr) => {
					if (
						this._forgersList.has(getAddressBuffer(curr.delegateAddress)) &&
						acc[curr.delegateAddress]
					) {
						acc[curr.delegateAddress].amount += BigInt(curr.amount);
					} else {
						acc[curr.delegateAddress] = {
							address: cryptography.address.getAddressFromPublicKey(
								Buffer.from(trx.senderPublicKey, 'hex'),
							),
							amount: BigInt(curr.amount),
						};
					}
					return acc;
				}, forgerReceivedVotes);
			}
		}

		return forgerReceivedVotes;
	}

	private async _addVotesReceived(transactions: ReadonlyArray<TransactionJSON>): Promise<void> {
		const forgerReceivedVotes = this._getForgerReceivedVotes(transactions);

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

	private async _revertVotesReceived(transactions: ReadonlyArray<TransactionJSON>): Promise<void> {
		const forgerReceivedVotes = this._getForgerReceivedVotes(transactions);

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

	private _getFee(transactions: ReadonlyArray<TransactionJSON>): bigint {
		let fee = BigInt(0);

		for (const txJSON of transactions) {
			const trx = chain.Transaction.fromJSON(txJSON);
			const minFeeRequired =
				BigInt(this._transactionFees.minFeePerByte) * BigInt(trx.getBytes().length);
			fee += BigInt(trx.fee) - minFeeRequired;
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
			genesisConfig: { blockTime },
		} = await this.apiClient.invoke<NodeInfo>('system_getNodeInfo');
		const missedBlocks = Math.ceil((timestamp - previousBlock.header.timestamp) / blockTime) - 1;

		if (missedBlocks > 0) {
			const forgersInfo = await this.apiClient.invoke<
				readonly { address: string; nextForgingTime: number }[]
			>('generator_getForgers');
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
