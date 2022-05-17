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
	validatorsHash: Buffer;
	aggregateCommit: AggregateCommit;
	signature: Buffer;
}

export interface Transaction {
	id: Buffer;
	moduleID: number;
	commandID: number;
	nonce: number;
	fee: number;
	senderPublicKey: Buffer;
	params: Buffer;
	signatures: Buffer[];
}

export interface BlockAsset {
	moduleID: number;
	data: Buffer;
}

export interface Block {
	header: BlockHeader;
	transaction: Transaction[];
	assets: BlockAsset[];
}

export interface Event {
	id: Buffer;
	moduleID: Buffer;
	typeID: Buffer;
	data: Buffer;
	topics: Buffer[];
	index: number;
}

export interface Validator {
	address: Buffer;
	bftWeight: number;
	generatorKey: Buffer;
	blsKey: Buffer;
}

export interface ModuleMeta {
	moduleID: number;
	commandIDs: number[];
}

export interface InitRequest {}

export interface SystemConfig {
	networkVersion: string;
	dataPath: string;
	maxBlockCache: number;
}

export interface IPCPRCConfig {
	path: string;
}

export interface WSPRCConfig {
	host: string;
	port: number;
}

export interface HTTPPRCConfig {
	host: string;
	port: number;
}

export interface RPCConfig {
	modes: string[];
	ipc: IPCPRCConfig;
	ws: WSPRCConfig;
	http: HTTPPRCConfig;
}

export interface LoggerConfig {
	consoleLogLevel: string;
	fileLogLevel: string;
}

export interface GenesisConfig {
	communityIdentifier: string;
	maxTransactionsSize: number;
	maxFeePerByte: number;
	blockTime: number;
	bftBatchSize: number;
}

export interface NetworkPeer {
	ip: string;
	port: number;
}

export interface NetworkConfig {
	port: number;
	hostIP: string;
	seedPeers: NetworkPeer[];
	fixedPeers: NetworkPeer[];
	whitelistedPeers: NetworkPeer[];
	blackListedIPs: string[];
	maxOutboundConnections: number;
	maxInboundConnections: number;
	advertiseAddress: boolean;
}

export interface TxpoolConfig {
	maxTransactions: number;
	maxTransactionsPerAccount: number;
	transactionExpiryTime: number;
	minEntranceFeePriority: number;
	minReplacementFeeDifference: number;
}

export interface Key {
	address: Buffer;
	encryptedPassphrase: string;
}

export interface GeneratorConfig {
	password: string;
	force: boolean;
	keys: Key[];
}

export interface Config {
	system: SystemConfig;
	rpc: RPCConfig;
	logger: LoggerConfig;
	genesis: GenesisConfig;
	network: NetworkConfig;
	txpool: TxpoolConfig;
	generator: GeneratorConfig;
}

export interface InitResponse {
	registeredModules: ModuleMeta[];
	genesisBlock: Block;
	config: Config;
}

export interface InitStateMachineRequest {
	networkIdentifier: Buffer;
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
	assets: BlockAsset[];
	events: Event[];
	preCommitThreshold: number;
	certificateThreshold: number;
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
	header: BlockHeader;
	assets: BlockAsset[];
}

export interface VerifyAssetsResponse {}

export interface Consensus {
	currentValidators: Validator[];
	implyMaxPrevote: boolean;
	maxHeightCertified: number;
}

export interface BeforeTransactionsExecuteRequest {
	contextID: Buffer;
	assets: BlockAsset[];
	consensus: Consensus;
}

export interface BeforeTransactionsExecuteResponse {
	events: Event[];
}

export interface AfterTransactionsExecuteRequest {
	contextID: Buffer;
	assets: BlockAsset[];
	consensus: Consensus;
	transactions: Transaction[];
}

export interface AfterTransactionsExecuteResponse {
	events: Event[];
	preCommitThreshold: number;
	certificateThreshold: number;
	nextValidators: Validator[];
}

export interface VerifyTransactionRequest {
	contextID: Buffer;
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
	networkIdentifier: Buffer;
	header: BlockHeader;
}

export interface QueryResponse {
	data: Buffer;
}

export interface ProveRequest {
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
