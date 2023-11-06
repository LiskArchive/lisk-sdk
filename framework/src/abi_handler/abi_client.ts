/*
 * Copyright © 2022 Lisk Foundation
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

import { codec, Schema } from '@liskhq/lisk-codec';
import { Dealer } from 'zeromq';
import {
	ABI,
	IPCResponse,
	initRequestSchema,
	initResponseSchema,
	InitRequest,
	InitResponse,
	InitStateMachineRequest,
	InitStateMachineResponse,
	InitGenesisStateRequest,
	InitGenesisStateResponse,
	InsertAssetsRequest,
	InsertAssetsResponse,
	VerifyAssetsRequest,
	VerifyAssetsResponse,
	BeforeTransactionsExecuteRequest,
	BeforeTransactionsExecuteResponse,
	AfterTransactionsExecuteRequest,
	AfterTransactionsExecuteResponse,
	VerifyTransactionRequest,
	VerifyTransactionResponse,
	ExecuteTransactionRequest,
	ExecuteTransactionResponse,
	CommitRequest,
	CommitResponse,
	RevertRequest,
	RevertResponse,
	ClearRequest,
	ClearResponse,
	FinalizeRequest,
	FinalizeResponse,
	MetadataRequest,
	MetadataResponse,
	QueryRequest,
	QueryResponse,
	ProveRequest,
	ProveResponse,
	afterTransactionsExecuteRequestSchema,
	afterTransactionsExecuteResponseSchema,
	beforeTransactionsExecuteRequestSchema,
	beforeTransactionsExecuteResponseSchema,
	clearRequestSchema,
	clearResponseSchema,
	commitRequestSchema,
	commitResponseSchema,
	executeTransactionRequestSchema,
	executeTransactionResponseSchema,
	finalizeRequestSchema,
	finalizeResponseSchema,
	initGenesisStateRequestSchema,
	initGenesisStateResponseSchema,
	initStateMachineRequestSchema,
	initStateMachineResponseSchema,
	insertAssetsRequestSchema,
	insertAssetsResponseSchema,
	ipcRequestSchema,
	ipcResponseSchema,
	metadataRequestSchema,
	metadataResponseSchema,
	proveRequestSchema,
	proveResponseSchema,
	queryRequestSchema,
	queryResponseSchema,
	revertRequestSchema,
	revertResponseSchema,
	verifyAssetsRequestSchema,
	verifyAssetsResponseSchema,
	verifyTransactionRequestSchema,
	verifyTransactionResponseSchema,
} from '../abi';
import { Logger } from '../logger';

const DEFAULT_TIMEOUT = 3000;
const MAX_UINT64 = BigInt(2) ** BigInt(64) - BigInt(1);

interface Defer<T> {
	promise: Promise<T>;
	resolve: (result: T) => void;
	reject: (error?: Error) => void;
}

const defer = <T>(): Defer<T> => {
	let resolve!: (res: T) => void;
	let reject!: (error?: Error) => void;

	const promise = new Promise<T>((_resolve, _reject) => {
		resolve = _resolve;
		reject = _reject;
	});

	return { promise, resolve, reject };
};

const timeout = async (ms: number, message?: string): Promise<never> =>
	new Promise((_, reject) => {
		const id = setTimeout(() => {
			clearTimeout(id);
			reject(new Error(message ?? `Timed out in ${ms}ms.`));
		}, ms);
	});

export class ABIClient implements ABI {
	private readonly _socketPath: string;
	private readonly _dealer: Dealer;
	private readonly _logger: Logger;

	private _pendingRequests: {
		[key: string]: Defer<unknown>;
	} = {};
	private _globalID = BigInt(0);

	public constructor(logger: Logger, socketPath: string) {
		this._logger = logger;
		this._socketPath = socketPath;
		this._dealer = new Dealer();
	}

	public async start(): Promise<void> {
		await new Promise((resolve, reject) => {
			const connectionTimeout = setTimeout(() => {
				reject(
					new Error('IPC Socket client connection timeout. Please check if IPC server is running.'),
				);
			}, DEFAULT_TIMEOUT);
			this._dealer.events.on('connect', () => {
				clearTimeout(connectionTimeout);
				resolve(undefined);
			});
			this._dealer.events.on('bind:error', reject);

			this._dealer.connect(this._socketPath);
		});
		this._listenToRPCResponse().catch(err => {
			this._logger.debug({ err: err as Error }, 'Failed to listen to the ABI response');
		});
	}

	public stop(): void {
		this._dealer.disconnect(this._socketPath);
		this._pendingRequests = {};
		this._globalID = BigInt(0);
	}

	public async init(req: InitRequest): Promise<InitResponse> {
		return this._call<InitResponse>('init', req, initRequestSchema, initResponseSchema);
	}

	public async initStateMachine(req: InitStateMachineRequest): Promise<InitStateMachineResponse> {
		return this._call<InitStateMachineResponse>(
			'initStateMachine',
			req,
			initStateMachineRequestSchema,
			initStateMachineResponseSchema,
		);
	}

	public async initGenesisState(req: InitGenesisStateRequest): Promise<InitGenesisStateResponse> {
		return this._call<InitGenesisStateResponse>(
			'initGenesisState',
			req,
			initGenesisStateRequestSchema,
			initGenesisStateResponseSchema,
		);
	}

	public async insertAssets(req: InsertAssetsRequest): Promise<InsertAssetsResponse> {
		return this._call<InsertAssetsResponse>(
			'insertAssets',
			req,
			insertAssetsRequestSchema,
			insertAssetsResponseSchema,
		);
	}

	public async verifyAssets(req: VerifyAssetsRequest): Promise<VerifyAssetsResponse> {
		return this._call<VerifyAssetsResponse>(
			'verifyAssets',
			req,
			verifyAssetsRequestSchema,
			verifyAssetsResponseSchema,
		);
	}

	public async beforeTransactionsExecute(
		req: BeforeTransactionsExecuteRequest,
	): Promise<BeforeTransactionsExecuteResponse> {
		return this._call<BeforeTransactionsExecuteResponse>(
			'beforeTransactionsExecute',
			req,
			beforeTransactionsExecuteRequestSchema,
			beforeTransactionsExecuteResponseSchema,
		);
	}

	public async afterTransactionsExecute(
		req: AfterTransactionsExecuteRequest,
	): Promise<AfterTransactionsExecuteResponse> {
		return this._call<AfterTransactionsExecuteResponse>(
			'afterTransactionsExecute',
			req,
			afterTransactionsExecuteRequestSchema,
			afterTransactionsExecuteResponseSchema,
		);
	}

	public async verifyTransaction(
		req: VerifyTransactionRequest,
	): Promise<VerifyTransactionResponse> {
		return this._call<VerifyTransactionResponse>(
			'verifyTransaction',
			req,
			verifyTransactionRequestSchema,
			verifyTransactionResponseSchema,
		);
	}

	public async executeTransaction(
		req: ExecuteTransactionRequest,
	): Promise<ExecuteTransactionResponse> {
		return this._call<ExecuteTransactionResponse>(
			'executeTransaction',
			req,
			executeTransactionRequestSchema,
			executeTransactionResponseSchema,
		);
	}

	public async commit(req: CommitRequest): Promise<CommitResponse> {
		return this._call<CommitResponse>('commit', req, commitRequestSchema, commitResponseSchema);
	}

	public async revert(req: RevertRequest): Promise<RevertResponse> {
		return this._call<RevertResponse>('revert', req, revertRequestSchema, revertResponseSchema);
	}

	public async clear(req: ClearRequest): Promise<ClearResponse> {
		return this._call<ClearResponse>('clear', req, clearRequestSchema, clearResponseSchema);
	}

	public async finalize(req: FinalizeRequest): Promise<FinalizeResponse> {
		return this._call<FinalizeResponse>(
			'finalize',
			req,
			finalizeRequestSchema,
			finalizeResponseSchema,
		);
	}

	public async getMetadata(req: MetadataRequest): Promise<MetadataResponse> {
		return this._call<MetadataResponse>(
			'getMetadata',
			req,
			metadataRequestSchema,
			metadataResponseSchema,
		);
	}

	public async query(req: QueryRequest): Promise<QueryResponse> {
		return this._call<QueryResponse>('query', req, queryRequestSchema, queryResponseSchema);
	}

	public async prove(req: ProveRequest): Promise<ProveResponse> {
		return this._call<ProveResponse>('prove', req, proveRequestSchema, proveResponseSchema);
	}

	// eslint-disable-next-line @typescript-eslint/ban-types
	private async _call<T>(
		method: string,
		req: object,
		requestSchema: Schema,
		respSchema: Schema,
	): Promise<T> {
		const params =
			Object.keys(requestSchema.properties).length > 0
				? codec.encode(requestSchema, req)
				: Buffer.alloc(0);
		const requestBody = {
			id: this._globalID,
			method,
			params,
		};
		this._logger.debug(
			{ method: requestBody.method, id: requestBody.id, file: 'abi_client' },
			'Requesting ABI server',
		);
		const encodedRequest = codec.encode(ipcRequestSchema, requestBody);
		await this._dealer.send([encodedRequest]);
		const response = defer<Buffer>();
		this._pendingRequests[this._globalID.toString()] = response as Defer<unknown>;
		// Increment ID before async task, reset to zero at MAX uint64
		this._globalID += BigInt(1);
		if (this._globalID >= MAX_UINT64) {
			this._globalID = BigInt(0);
		}

		const resp = await Promise.race([
			response.promise,
			timeout(DEFAULT_TIMEOUT, `Response not received in ${DEFAULT_TIMEOUT}ms`),
		]);
		this._logger.debug(
			{ method: requestBody.method, id: requestBody.id, file: 'abi_client' },
			'Received response from ABI server',
		);
		const decodedResp =
			Object.keys(respSchema.properties).length > 0 ? codec.decode<T>(respSchema, resp) : ({} as T);

		return decodedResp;
	}

	private async _listenToRPCResponse() {
		for await (const [message] of this._dealer) {
			let response: IPCResponse;
			try {
				response = codec.decode<IPCResponse>(ipcResponseSchema, message);
			} catch (error) {
				this._logger.debug({ err: error as Error }, 'Failed to decode ABI response');
				continue;
			}
			const deferred = this._pendingRequests[response.id.toString()];
			if (!deferred) {
				continue;
			}

			if (!response.success) {
				deferred.reject(new Error(response.error.message));
			} else {
				deferred.resolve(response.result);
			}

			delete this._pendingRequests[response.id.toString()];
		}
	}
}
