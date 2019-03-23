import {
	bufferToBigNumberString,
	getFirstEightBytesReversed,
	getKeys,
	hash,
	hexToBuffer,
	signDataWithPassphrase,
} from '@liskhq/lisk-cryptography';
import * as BigNum from '@liskhq/bignum';
import { debug } from 'debug';
import { calculateRewawrd, RewardsOption } from './reward';
import { blockSchema } from './schema';
import { StateStore } from './state_store';
import { getTimeFromBlockchainEpoch } from './time';
import {
	calculateTransactionsData,
	rawTransactionToInstance,
	sortTransactions,
} from './transactions';
import {
	BlockJSON,
	Status,
	Transaction,
	TransactionJSON,
	TransactionMap,
	TransactionResponse,
} from './types';
import { validator } from './validate';
import { applyVote, undoVote } from './vote';

const logger = debug('blockchain:block');
const SIZE_INT32 = 4;
const SIZE_INT64 = 8;

interface CreateBlockInput {
	readonly version: number;
	readonly epochTime: number;
	readonly lastBlock: Block;
	readonly txMap: TransactionMap;
	readonly passphrase: string;
	readonly rewards: RewardsOption;
	readonly transactions: ReadonlyArray<TransactionJSON>;
}

export const getBlockId = (blockBytes: Buffer) => {
	const blockHash = hash(blockBytes);
	const bufferFromFirstEntriesReversed = getFirstEightBytesReversed(blockHash);
	const firstEntriesToNumber = bufferToBigNumberString(
		bufferFromFirstEntriesReversed,
	);

	return firstEntriesToNumber;
};

export class Block {
	public readonly id: string;
	public readonly height: number;
	public readonly version: number;
	public readonly timestamp: number;
	public readonly previousBlock: string | undefined;
	public readonly numberOfTransactions: number;
	public readonly totalFee: string;
	public readonly totalAmount: string;
	public readonly reward: string;
	public readonly payloadHash: string;
	public readonly payloadLength: number;
	public readonly generatorPublicKey: string;
	public transactions: ReadonlyArray<Transaction>;

	public blockSignature?: string;

	public constructor(
		blockHeader: BlockJSON,
		transactions: ReadonlyArray<Transaction>,
	) {
		this.height = blockHeader.height || 0;
		this.version = blockHeader.version;
		this.timestamp = blockHeader.timestamp;
		this.previousBlock = blockHeader.previousBlock;
		this.numberOfTransactions = blockHeader.numberOfTransactions;
		this.totalFee = blockHeader.totalFee;
		this.totalAmount = blockHeader.totalAmount;
		this.reward = blockHeader.reward;
		this.payloadHash = blockHeader.payloadHash;
		this.payloadLength = blockHeader.payloadLength;
		this.generatorPublicKey = blockHeader.generatorPublicKey;
		this.blockSignature = blockHeader.blockSignature;
		this.transactions = transactions;
		this.id = blockHeader.id as string;
		// TODO: recalculate blockID, but blockID calculation is wrong
		// this.id = getBlockId(this._getBytes());
	}

	public validate(): ReadonlyArray<Error> {
		validator.validate(blockSchema, this.toJSON());
		const blockError = validator.errors
			? validator.errors.map(err => new Error(err.message))
			: [];
		const txErrors = this.transactions
			.reduce(
				(prev, current) => prev.concat(current.validate()),
				[] as ReadonlyArray<TransactionResponse>,
			)
			.reduce((prev, current) => prev.concat(current.errors), [] as Error[]);

		logger('Validated block schema with errors', {
			error: [...blockError, ...txErrors],
		});

		return [...blockError, ...txErrors];
	}

	public sign(passphrase: string): void {
		const buff = this._getBytes();
		this.blockSignature = signDataWithPassphrase(buff, passphrase);
	}

	public async verify(store: StateStore): Promise<ReadonlyArray<Error>> {
		const responses = await Promise.all(
			this.transactions.map(async tx => {
				const snapshotId = store.createSnapshot();
				const res = await tx.apply(store);
				store.restoreSnapshot(snapshotId);

				return res;
			}),
		);

		return responses
			.filter(res => res.status === Status.FAIL)
			.reduce((prev, current) => prev.concat(current.errors as []), []);
	}

	public async apply(store: StateStore): Promise<ReadonlyArray<Error>> {
		const errors = [];
		logger('Start applying block', {
			id: this.id,
		});
		// tslint:disable-next-line no-loop-statement
		for (const tx of this.transactions) {
			const res = await tx.apply(store);
			await applyVote(store, tx);
			errors.push(...res.errors);
		}

		return errors;
	}

	public async undo(store: StateStore): Promise<ReadonlyArray<Error>> {
		const errors = [];
		// tslint:disable-next-line no-loop-statement
		for (const tx of this.transactions) {
			await undoVote(store, tx);
			const res = await tx.undo(store);
			errors.push(...res.errors);
		}

		return errors;
	}

	public toJSON(): BlockJSON {
		return {
			id: this.id,
			height: this.height,
			version: this.version,
			timestamp: this.timestamp,
			previousBlock: this.previousBlock,
			numberOfTransactions: this.numberOfTransactions,
			totalFee: this.totalFee,
			totalAmount: this.totalAmount,
			reward: this.reward,
			payloadHash: this.payloadHash,
			payloadLength: this.payloadLength,
			blockSignature: this.blockSignature,
			generatorPublicKey: this.generatorPublicKey,
			transactions: this.transactions.map(tx => tx.toJSON() as TransactionJSON),
		};
	}

	private _getBytes(): Buffer {
		const versionBuffer = Buffer.alloc(SIZE_INT32);
		versionBuffer.writeInt32LE(this.version, 0);
		const timestampBuffer = Buffer.alloc(SIZE_INT32);
		timestampBuffer.writeInt32LE(this.timestamp, 0);
		const prevBlockBuffer = this.previousBlock
			? new BigNum(this.previousBlock).toBuffer({
					endian: 'big',
					size: SIZE_INT64,
			  })
			: Buffer.alloc(SIZE_INT64);
		const numTxBuffer = Buffer.alloc(SIZE_INT32);
		numTxBuffer.writeInt32LE(this.numberOfTransactions, 0);
		const totalAmountBuffer = new BigNum(this.totalAmount).toBuffer({
			endian: 'little',
			size: SIZE_INT64,
		});
		const totalFeeBuffer = new BigNum(this.totalFee).toBuffer({
			endian: 'little',
			size: SIZE_INT64,
		});
		const rewardBuffer = new BigNum(this.reward).toBuffer({
			endian: 'little',
			size: SIZE_INT64,
		});
		const payloadLengthBuffer = Buffer.alloc(SIZE_INT32);
		payloadLengthBuffer.writeInt32LE(this.payloadLength, 0);
		const payloadHashBuffer = hexToBuffer(this.payloadHash);
		const generatorPublicKeyBuffer = hexToBuffer(this.generatorPublicKey);

		return Buffer.concat([
			versionBuffer,
			timestampBuffer,
			prevBlockBuffer,
			numTxBuffer,
			totalAmountBuffer,
			totalFeeBuffer,
			rewardBuffer,
			payloadLengthBuffer,
			payloadHashBuffer,
			generatorPublicKeyBuffer,
		]);
	}
}

export const createBlock = ({
	txMap,
	version,
	epochTime,
	lastBlock,
	rewards,
	transactions,
	passphrase,
}: CreateBlockInput): Block => {
	const sortedTransactions = sortTransactions(
		transactions as TransactionJSON[],
	);
	const height = lastBlock.height + 1;
	const txs = rawTransactionToInstance(txMap, sortedTransactions);
	const reward = calculateRewawrd(rewards, height);
	const timestamp = getTimeFromBlockchainEpoch(epochTime);
	const { publicKey } = getKeys(passphrase);
	const rawBlock = {
		version,
		height,
		previousBlock: lastBlock.id,
		timestamp,
		reward,
		// Calculate tx related property
		...calculateTransactionsData(txs),
		transactions: sortedTransactions,
		generatorPublicKey: publicKey,
	};
	// Get reward
	const block = new Block(rawBlock, txs);
	block.sign(passphrase);

	return block;
};
