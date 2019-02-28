import * as BigNum from 'browserify-bignum';
import { StateStore } from './state_store';

export interface BlockJSON {
	readonly id?: string;
	readonly height?: number;
	readonly version: number;
	readonly timestamp: number;
	readonly previousBlock?: string;
	readonly numberOfTransactions: number;
	readonly totalFee: string;
	readonly totalAmount: string;
	readonly reward: string;
	readonly payloadHash: string;
	readonly payloadLength: number;
	readonly generatorPublicKey: string;
	readonly blockSignature?: string;
	readonly transactions: ReadonlyArray<TransactionJSON>;
}

export enum Status {
	FAIL = 0,
	OK = 1,
	PENDING = 2,
}

export interface TransactionResponse {
	readonly id: string;
	readonly status: Status;
	readonly errors: ReadonlyArray<Error>;
}

interface TransactionFunc {
	getBytes(): Buffer;
	toJSON(): object;
	validate(): TransactionResponse;
	apply(store: StateStore): Promise<TransactionResponse>;
	undo(store: StateStore): Promise<TransactionResponse>;
}

export interface CacheMap {
	// tslint:disable-next-line readonly-keyword
	[bucket: string]: {
		// tslint:disable-next-line readonly-keyword no-any
		[key: string]: any;
	};
}

interface TransactionProps {
	readonly type: number;
	readonly senderId: string;
	readonly recipientId?: string;
	readonly fee: BigNum;
	readonly amount: BigNum;
}

export type Transaction = TransactionFunc & TransactionProps;

export type TransactionClass = new (raw: TransactionJSON) => Transaction;

export interface TransactionMap {
	readonly [key: number]: TransactionClass;
}

export interface InTransferTransaction extends Transaction {
	readonly asset: {
		readonly inTransfer: {
			readonly dappId: string;
		};
	};
}

export interface VoteTransaction extends Transaction {
	readonly asset: {
		readonly votes: ReadonlyArray<string>;
	};
}

export interface TransactionJSON {
	readonly amount: string | number;
	readonly asset: object;
	readonly fee: string;
	readonly id?: string;
	readonly recipientId: string;
	readonly recipientPublicKey?: string;
	readonly senderId?: string;
	readonly senderPublicKey: string;
	readonly signature?: string;
	readonly signatures?: ReadonlyArray<string>;
	readonly signSignature?: string;
	readonly timestamp: number;
	readonly type: number;
}

export interface BatchCommand {
	readonly type: 'put' | 'del';
	readonly bucket: string;
	readonly key: string | number;
	// tslint:disable-next-line no-any
	readonly value?: any;
}

export interface ReadStreamOption {
	// tslint:disable-next-line no-any
	readonly gt?: any;
	// tslint:disable-next-line no-any
	readonly gte?: any;
	// tslint:disable-next-line no-any
	readonly lt?: any;
	// tslint:disable-next-line no-any
	readonly lte?: any;
	readonly reverse?: boolean;
	readonly limit?: number;
	readonly keys?: boolean;
	readonly values?: boolean;
}

export interface DataStore {
	// tslint:disable-next-line no-any
	get<T>(bucket: string, key: string | number): Promise<T>;
	// tslint:disable-next-line no-any
	put<T>(bucket: string, key: string, value: T): Promise<void>;
	del(bucket: string, key: string): Promise<void>;
	batch(tasks: ReadonlyArray<BatchCommand>): Promise<void>;
	createReadStream(options?: ReadStreamOption): NodeJS.ReadableStream;
}
