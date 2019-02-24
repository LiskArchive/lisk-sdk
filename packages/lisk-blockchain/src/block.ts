import {
	bufferToBigNumberString,
	getFirstEightBytesReversed,
	getKeys,
	hash,
	hexToBuffer,
	signDataWithPassphrase,
} from '@liskhq/lisk-cryptography';
import * as BigNum from 'browserify-bignum';
import { calculateRewawrd, Milestones } from './reward';
import { blockSchema } from './schema';
import { StateStore } from './state_store';
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

const SIZE_INT32 = 4;
const SIZE_INT64 = 8;

interface CreateBlockInput {
	readonly height: number;
	readonly version: number;
	readonly timestamp: number;
	readonly txMap: TransactionMap;
	readonly passphrase: string;
	readonly milestones: Milestones;
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

export const createBlock = ({
	height,
	txMap,
	version,
	timestamp,
	milestones,
	transactions,
	passphrase,
}: CreateBlockInput): Block => {
	const sortedTransactions = sortTransactions(
		transactions as TransactionJSON[],
	);
	const txs = rawTransactionToInstance(txMap, sortedTransactions);
	const reward = calculateRewawrd(milestones, height);
	const { publicKey } = getKeys(passphrase);
	const rawBlock = {
		version,
		height,
		timestamp,
		reward,
		...calculateTransactionsData(txs),
		transactions: sortedTransactions,
		generatorPublicKey: publicKey,
	};
	// Calculate tx related property
	// Get public key from passphrase
	// Get reward
	const block = new Block(rawBlock, txs);
	block.sign(passphrase);

	return block;
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
		this.transactions = transactions;
		this.id = getBlockId(this._getBytes());
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

		return [...blockError, ...txErrors];
	}

	public sign(passphrase: string): void {
		const buff = this._getBytes();
		this.blockSignature = signDataWithPassphrase(buff, passphrase);
	}

	public async verify(store: StateStore): Promise<ReadonlyArray<Error>> {
		return this.transactions
			.map(tx => {
				const snapshotId = store.createSnapshot();
				const res = tx.apply(store);
				store.restoreSnapshot(snapshotId);

				return res;
			})
			.filter(res => res.status === Status.FAIL)
			.reduce((prev, current) => prev.concat(current.errors as []), []);
	}

	public async apply(store: StateStore): Promise<ReadonlyArray<Error>> {
		const errors = [];
		// tslint:disable-next-line no-loop-statement
		for (const tx of this.transactions) {
			const res = await tx.apply(store);
			const voteErrors = await applyVote(store, tx);
			errors.push(...res.errors);
			errors.push(...voteErrors);
		}

		return errors;
	}

	public async undo(store: StateStore): Promise<ReadonlyArray<Error>> {
		const errors = [];
		// tslint:disable-next-line no-loop-statement
		for (const tx of this.transactions) {
			const res = await tx.undo(store);
			const voteErrors = await undoVote(store, tx);
			errors.push(...res.errors);
			errors.push(...voteErrors);
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
			generatorPublicKey: this.generatorPublicKey,
			transactions: this.transactions.map(tx => tx.toJSON()),
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
