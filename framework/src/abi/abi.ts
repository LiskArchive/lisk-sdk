/* eslint-disable @typescript-eslint/no-empty-interface */
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

export interface ABI {
	init(req: InitRequest): Promise<InitResponse>;
	initStateMachine(req: InitStateMachineRequest): Promise<InitStateMachineResponse>;
	initGenesisState(req: InitGenesisStateRequest): Promise<InitGenesisStateResponse>;
	insertAssets(req: InsertAssetsRequest): Promise<InsertAssetsResponse>;
	verifyAssets(req: VerifyAssetsRequest): Promise<VerifyAssetsResponse>;
	beforeTransactionsExecute(
		req: BeforeTransactionsExecuteRequest,
	): Promise<BeforeTransactionsExecuteResponse>;
	afterTransactionsExecute(
		req: AfterTransactionsExecuteRequest,
	): Promise<AfterTransactionsExecuteResponse>;
	verifyTransaction(req: VerifyTransactionRequest): Promise<VerifyTransactionResponse>;
	executeTransaction(req: ExecuteTransactionRequest): Promise<ExecuteTransactionResponse>;
	commit(req: CommitRequest): Promise<CommitResponse>;
	revert(req: RevertRequest): Promise<RevertResponse>;
	clear(req: ClearRequest): Promise<ClearResponse>;
	finalize(req: FinalizeRequest): Promise<FinalizeResponse>;
	getMetadata(req: MetadataRequest): Promise<MetadataResponse>;
	query(req: QueryRequest): Promise<QueryResponse>;
	prove(req: ProveRequest): Promise<ProveResponse>;
}

export interface AggregateCommit {
	height: number;
	aggregationBits: Buffer;
	certificateSignature: Buffer;
}

export interface BlockHeader {
	id: Buffer;
	version: number;
	timestamp: number;
	height: number;
	previousBlockID: Buffer;
	generatorAddress: Buffer;
	transactionRoot: Buffer;
	assetRoot: Buffer;
	eventRoot: Buffer;
	stateRoot: Buffer;
	maxHeightPrevoted: number;
	maxHeightGenerated: number;
	impliesMaxPrevotes: boolean;
	validatorsHash: Buffer;
	aggregateCommit: AggregateCommit;
	signature: Buffer;
}

export interface Transaction {
	module: string;
	command: string;
	nonce: bigint;
	fee: bigint;
	senderPublicKey: Buffer;
	params: Buffer;
	signatures: readonly Buffer[];
}

export interface BlockAsset {
	module: string;
	data: Buffer;
}

export interface Block {
	header: BlockHeader;
	transactions: Transaction[];
	assets: BlockAsset[];
}

export interface Event {
	module: string;
	name: string;
	data: Buffer;
	topics: Buffer[];
	index: number;
	height: number;
}

export interface Validator {
	address: Buffer;
	bftWeight: bigint;
	generatorKey: Buffer;
	blsKey: Buffer;
}

export interface InitRequest {
	chainID: Buffer;
	lastBlockHeight: number;
	lastStateRoot: Buffer;
}

export interface InitResponse {}

export interface InitStateMachineRequest {
	header: BlockHeader;
}

export interface InitStateMachineResponse {
	contextID: Buffer;
}

export interface InitGenesisStateRequest {
	contextID: Buffer;
	stateRoot: Buffer;
}

export interface InitGenesisStateResponse {
	events: Event[];
	preCommitThreshold: bigint;
	certificateThreshold: bigint;
	nextValidators: Validator[];
}

export interface InsertAssetsRequest {
	contextID: Buffer;
	finalizedHeight: number;
}

export interface InsertAssetsResponse {
	assets: BlockAsset[];
}

export interface VerifyAssetsRequest {
	contextID: Buffer;
	assets: BlockAsset[];
}

export interface VerifyAssetsResponse {}

export interface BeforeTransactionsExecuteRequest {
	contextID: Buffer;
	assets: BlockAsset[];
}

export interface BeforeTransactionsExecuteResponse {
	events: Event[];
}

export interface AfterTransactionsExecuteRequest {
	contextID: Buffer;
	assets: BlockAsset[];
	transactions: Transaction[];
}

export interface AfterTransactionsExecuteResponse {
	events: Event[];
	preCommitThreshold: bigint;
	certificateThreshold: bigint;
	nextValidators: Validator[];
}

export interface VerifyTransactionRequest {
	contextID: Buffer;
	header: BlockHeader;
	transaction: Transaction;
}

export interface VerifyTransactionResponse {
	result: number;
}

export interface ExecuteTransactionRequest {
	contextID: Buffer;
	transaction: Transaction;
	assets: BlockAsset[];
	dryRun: boolean;
	header: BlockHeader;
}

export interface ExecuteTransactionResponse {
	events: Event[];
	result: number;
}

export interface CommitRequest {
	contextID: Buffer;
	stateRoot: Buffer;
	expectedStateRoot: Buffer;
	dryRun: boolean;
}

export interface CommitResponse {
	stateRoot: Buffer;
}

export interface RevertRequest {
	contextID: Buffer;
	stateRoot: Buffer;
	expectedStateRoot: Buffer;
}

export interface RevertResponse {
	stateRoot: Buffer;
}

export interface FinalizeRequest {
	finalizedHeight: number;
}

export interface FinalizeResponse {}

export interface ClearRequest {}

export interface ClearResponse {}

export interface MetadataRequest {}

export interface MetadataResponse {
	data: Buffer;
}

export interface QueryRequest {
	method: string;
	params: Buffer;
	header: BlockHeader;
}

export interface QueryResponse {
	data: Buffer;
}

export interface ProveRequest {
	stateRoot: Buffer;
	keys: Buffer[];
}

export interface Proof {
	siblingHashes: Buffer[];
	queries: QueryProof[];
}

export interface QueryProof {
	key: Buffer;
	value: Buffer;
	bitmap: Buffer;
}

export interface ProveResponse {
	proof: Proof;
}

export interface IPCRequest {
	id: bigint;
	method: string;
	params: Buffer;
}

export interface IPCResponse {
	id: bigint;
	success: boolean;
	error: {
		message: string;
	};
	result: Buffer;
}
