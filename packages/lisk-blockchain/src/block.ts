import { hexToBuffer, signDataWithPassphrase } from '@liskhq/lisk-cryptography';
import * as BigNum from 'browserify-bignum';
import { StateStore } from './state_store';
import {
	BlockJSON,
	Status,
	Transaction,
	TransactionJSON,
	TransactionMap,
} from './types';

const SIZE_INT32 = 4;
const SIZE_INT64 = 8;

interface CreateBlockInput {
	readonly txMap: TransactionMap;
	readonly passphrase: string;
	readonly transactions: ReadonlyArray<TransactionJSON>;
}

export const createBlock = ({
	txMap,
	transactions,
	passphrase,
}: CreateBlockInput): Block => {
	const rawBlock = {
		transactions,
	};
	const block = new Block(rawBlock, txMap);
	block.sign(passphrase);

	return block;
};

export class Block {
	public readonly id?: string;
	public readonly height?: number;
	public readonly version: number;
	public readonly timestamp: number;
	public readonly previousBlock: string;
	public readonly numberOfTransactions: number;
	public readonly totalFee: string;
	public readonly totalAmount: string;
	public readonly reward: string;
	public readonly payloadHash: string;
	public readonly payloadLength: number;
	public readonly generatorPublicKey: string;
	public transactions: ReadonlyArray<Transaction>;

	public blockSignature?: string;

	public constructor(rawBlock: BlockJSON, txMap: TransactionMap) {
		this.id = rawBlock.id;
		this.height = rawBlock.height;
		this.version = rawBlock.version;
		this.timestamp = rawBlock.timestamp;
		this.previousBlock = rawBlock.previousBlock;
		this.numberOfTransactions = rawBlock.numberOfTransactions;
		this.totalFee = rawBlock.totalFee;
		this.totalAmount = rawBlock.totalAmount;
		this.reward = rawBlock.reward;
		this.payloadHash = rawBlock.payloadHash;
		this.payloadLength = rawBlock.payloadLength;
		this.generatorPublicKey = rawBlock.generatorPublicKey;
		this.transactions = rawBlock.transactions.map(
			raw => new txMap[raw.type](raw),
		);
	}

	public validate(): ReadonlyArray<Error> {
		return [];
	}

	public sign(passphrase: string): void {
		const buff = this._getBytes();
		this.blockSignature = signDataWithPassphrase(buff, passphrase);
	}

	public async verify(store: StateStore): Promise<ReadonlyArray<Error>> {
		return this.transactions
			.map(tx => {
				const snapshotId = store.createSnapshot();
				store.mutate = false;
				const res = tx.apply(store);
				store.restoreSnapshot(snapshotId);
				store.mutate = true;

				return res;
			})
			.filter(res => res.status === Status.FAIL)
			.reduce((prev, current) => prev.concat(current.errors as []), []);
	}

	public async apply(store: StateStore): Promise<ReadonlyArray<Error>> {
		return this.transactions
			.map(tx => tx.apply(store))
			.filter(res => res.status === Status.FAIL)
			.reduce((prev, current) => prev.concat(current.errors as []), []);
	}

	public async undo(store: StateStore): Promise<ReadonlyArray<Error>> {
		return this.transactions
			.map(tx => tx.undo(store))
			.filter(res => res.status === Status.FAIL)
			.reduce((prev, current) => prev.concat(current.errors as []), []);
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
