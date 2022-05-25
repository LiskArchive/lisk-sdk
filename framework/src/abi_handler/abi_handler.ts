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
import * as path from 'path';
import {
	Block,
	BlockAssets,
	BlockHeader,
	concatDBKeys,
	DB_KEY_DIFF_STATE,
	SMTStore,
	stateDiffSchema,
	StateStore,
	Transaction,
} from '@liskhq/lisk-chain';
import { formatInt, KVStore } from '@liskhq/lisk-db';
import {
	DEFAULT_EXPIRY_TIME,
	DEFAULT_MAX_TRANSACTIONS,
	DEFAULT_MAX_TRANSACTIONS_PER_ACCOUNT,
	DEFAULT_MINIMUM_REPLACEMENT_FEE_DIFFERENCE,
	DEFAULT_MIN_ENTRANCE_FEE_PRIORITY,
} from '@liskhq/lisk-transaction-pool';
import { codec } from '@liskhq/lisk-codec';
import { hash } from '@liskhq/lisk-cryptography';
import { SparseMerkleTree } from '@liskhq/lisk-tree';
import {
	ABI,
	blockHeaderSchema,
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
	TransactionExecutionResult,
} from '../abi';
import { Logger } from '../logger';
import { BaseModule } from '../modules';
import {
	BlockContext,
	EventQueue,
	GenesisBlockContext,
	StateMachine,
	TransactionContext,
} from '../node/state_machine';
import { ApplicationConfig } from '../types';
import {
	DEFAULT_HOST,
	DEFAULT_MAX_INBOUND_CONNECTIONS,
	DEFAULT_MAX_OUTBOUND_CONNECTIONS,
	DEFAULT_PORT_P2P,
	DEFAULT_PORT_RPC,
	MAX_BLOCK_CACHE,
} from '../constants';
import { GenerationContext } from '../node/state_machine/generator_context';
import { BaseChannel } from '../controller/channels';
import { systemDirs } from '../system_dirs';

export interface ABIHandlerConstructor {
	config: ApplicationConfig;
	logger: Logger;
	stateMachine: StateMachine;
	genesisBlock: Block;
	stateDB: KVStore;
	moduleDB: KVStore;
	modules: BaseModule[];
	channel: BaseChannel;
}

interface ExecutionContext {
	id: Buffer;
	networkIdentifier: Buffer;
	header: BlockHeader;
	stateStore: StateStore;
	moduleStore: StateStore;
}

export class ABIHandler implements ABI {
	private readonly _config: ApplicationConfig;
	private readonly _logger: Logger;
	private readonly _stateMachine: StateMachine;
	private readonly _stateDB: KVStore;
	private readonly _moduleDB: KVStore;
	private readonly _modules: BaseModule[];
	private readonly _channel: BaseChannel;

	private _genesisBlock?: Block;
	private _executionContext: ExecutionContext | undefined;

	public constructor(args: ABIHandlerConstructor) {
		this._config = args.config;
		this._logger = args.logger;
		this._genesisBlock = args.genesisBlock;
		this._stateMachine = args.stateMachine;
		this._stateDB = args.stateDB;
		this._moduleDB = args.moduleDB;
		this._modules = args.modules;
		this._channel = args.channel;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(_req: InitRequest): Promise<InitResponse> {
		const { dataPath } = systemDirs(this._config.label, this._config.rootPath);
		if (!this._genesisBlock) {
			throw new Error('Genesis block must exist at initialization');
		}
		return {
			genesisBlock: {
				header: {
					...this._genesisBlock.header.toObject(),
				},
				// TODO: Replace after updating the block header
				// header: this._genesisBlock.header.toObject(),
				assets: this._genesisBlock.assets.getAll(),
				transactions: [],
			},
			registeredModules: this._modules.map(mod => ({
				moduleID: mod.id,
				commandIDs: mod.commands.map(command => command.id),
			})),
			config: {
				logger: this._config.logger,
				system: {
					dataPath,
					keepEventsForHeights: this._config.system.keepEventsForHeights,
					version: this._config.version,
					maxBlockCache: MAX_BLOCK_CACHE,
					networkVersion: this._config.networkVersion,
				},
				genesis: {
					bftBatchSize: this._config.genesis.blockTime,
					blockTime: this._config.genesis.blockTime,
					communityIdentifier: this._config.genesis.communityIdentifier,
					minFeePerByte: this._config.genesis.minFeePerByte,
					maxTransactionsSize: this._config.genesis.maxTransactionsSize,
				},
				generator: {
					force: this._config.generation.force ?? false,
					password: this._config.generation.defaultPassword ?? '',
					keys: this._config.generation.generators.map(gen => ({
						address: Buffer.from(gen.address, 'hex'),
						encryptedPassphrase: gen.encryptedPassphrase,
					})),
				},
				txpool: {
					maxTransactions: this._config.transactionPool.maxTransactions ?? DEFAULT_MAX_TRANSACTIONS,
					maxTransactionsPerAccount:
						this._config.transactionPool.maxTransactions ?? DEFAULT_MAX_TRANSACTIONS_PER_ACCOUNT,
					minEntranceFeePriority: this._config.transactionPool.minEntranceFeePriority
						? BigInt(this._config.transactionPool.minEntranceFeePriority)
						: DEFAULT_MIN_ENTRANCE_FEE_PRIORITY,
					minReplacementFeeDifference: this._config.transactionPool.minReplacementFeeDifference
						? BigInt(this._config.transactionPool.minReplacementFeeDifference)
						: DEFAULT_MINIMUM_REPLACEMENT_FEE_DIFFERENCE,
					transactionExpiryTime:
						this._config.transactionPool.transactionExpiryTime ?? DEFAULT_EXPIRY_TIME,
				},
				network: {
					...this._config.network,
					port: this._config.network.port ?? DEFAULT_PORT_P2P,
					blacklistedIPs: this._config.network.blacklistedIPs ?? [],
					advertiseAddress: this._config.network.advertiseAddress ?? false,
					fixedPeers: this._config.network.fixedPeers ?? [],
					seedPeers: this._config.network.seedPeers,
					hostIP: this._config.network.hostIp ?? DEFAULT_HOST,
					maxInboundConnections:
						this._config.network.maxInboundConnections ?? DEFAULT_MAX_INBOUND_CONNECTIONS,
					maxOutboundConnections:
						this._config.network.maxOutboundConnections ?? DEFAULT_MAX_OUTBOUND_CONNECTIONS,
					whitelistedPeers: this._config.network.whitelistedPeers ?? [],
				},
				rpc: {
					...this._config.rpc,
					modes: this._config.rpc.modes,
					ipc: {
						path: this._config.rpc.ipc?.path ?? path.join(dataPath, 'socket', 'ipc'),
					},
					http: {
						host: this._config.rpc.http?.host ?? DEFAULT_HOST,
						port: this._config.rpc.http?.port ?? DEFAULT_PORT_RPC,
					},
					ws: {
						host: this._config.rpc.http?.host ?? DEFAULT_HOST,
						port: this._config.rpc.http?.port ?? DEFAULT_PORT_RPC,
					},
				},
			},
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async initStateMachine(req: InitStateMachineRequest): Promise<InitStateMachineResponse> {
		if (this._executionContext !== undefined) {
			throw new Error(
				`Execution context is already initialized with ${this._executionContext.id.toString(
					'hex',
				)}`,
			);
		}
		const id = hash(codec.encode(blockHeaderSchema, req.header));
		this._executionContext = {
			id,
			header: new BlockHeader(req.header),
			networkIdentifier: req.networkIdentifier,
			stateStore: new StateStore(this._stateDB),
			moduleStore: new StateStore(this._moduleDB),
		};
		return {
			contextID: id,
		};
	}

	public async initGenesisState(req: InitGenesisStateRequest): Promise<InitGenesisStateResponse> {
		if (!this._genesisBlock) {
			throw new Error('Genesis block must exist at initialization');
		}
		if (!this._executionContext || !this._executionContext.id.equals(req.contextID)) {
			throw new Error(
				`Invalid context id ${req.contextID.toString(
					'hex',
				)}. Context is not initialized or different.`,
			);
		}
		const context = new GenesisBlockContext({
			eventQueue: new EventQueue(),
			header: this._executionContext.header,
			logger: this._logger,
			stateStore: this._executionContext.stateStore,
			assets: this._genesisBlock.assets,
		});

		await this._stateMachine.executeGenesisBlock(context);
		return {
			assets: this._genesisBlock.assets.getAll(),
			events: context.eventQueue.getEvents().map(e => e.toObject()),
			certificateThreshold: context.nextValidators.certificateThreshold,
			nextValidators: context.nextValidators.validators,
			preCommitThreshold: context.nextValidators.precommitThreshold,
		};
	}

	public async insertAssets(req: InsertAssetsRequest): Promise<InsertAssetsResponse> {
		if (!this._executionContext || !this._executionContext.id.equals(req.contextID)) {
			throw new Error(
				`Invalid context id ${req.contextID.toString(
					'hex',
				)}. Context is not initialized or different.`,
			);
		}
		const context = new GenerationContext({
			header: this._executionContext.header,
			logger: this._logger,
			stateStore: this._executionContext.stateStore,
			networkIdentifier: this._executionContext.networkIdentifier,
			generatorStore: this._executionContext.moduleStore,
			finalizedHeight: req.finalizedHeight,
		});
		await this._stateMachine.insertAssets(context);
		return {
			assets: context.assets.getAll(),
		};
	}

	public async verifyAssets(req: VerifyAssetsRequest): Promise<VerifyAssetsResponse> {
		// Remove genesis block from memory
		this._genesisBlock = undefined;
		if (!this._executionContext || !this._executionContext.id.equals(req.contextID)) {
			throw new Error(
				`Invalid context id ${req.contextID.toString(
					'hex',
				)}. Context is not initialized or different.`,
			);
		}
		const context = new BlockContext({
			header: this._executionContext.header,
			logger: this._logger,
			stateStore: this._executionContext.stateStore,
			networkIdentifier: this._executionContext.networkIdentifier,
			assets: new BlockAssets(req.assets),
			eventQueue: new EventQueue(),
			// verifyAssets does not have access to transactions
			transactions: [],
			// verifyAssets does not have access to those properties
			currentValidators: [],
			impliesMaxPrevote: false,
			maxHeightCertified: 0,
		});
		await this._stateMachine.verifyAssets(context);

		return {};
	}

	public async beforeTransactionsExecute(
		req: BeforeTransactionsExecuteRequest,
	): Promise<BeforeTransactionsExecuteResponse> {
		if (!this._executionContext || !this._executionContext.id.equals(req.contextID)) {
			throw new Error(
				`Invalid context id ${req.contextID.toString(
					'hex',
				)}. Context is not initialized or different.`,
			);
		}
		const context = new BlockContext({
			header: this._executionContext.header,
			logger: this._logger,
			stateStore: this._executionContext.stateStore,
			networkIdentifier: this._executionContext.networkIdentifier,
			assets: new BlockAssets(req.assets),
			eventQueue: new EventQueue(),
			currentValidators: req.consensus.currentValidators,
			impliesMaxPrevote: req.consensus.implyMaxPrevote,
			maxHeightCertified: req.consensus.maxHeightCertified,
			transactions: [],
		});
		await this._stateMachine.beforeExecuteBlock(context);

		return {
			events: context.eventQueue.getEvents().map(e => e.toObject()),
		};
	}

	public async afterTransactionsExecute(
		req: AfterTransactionsExecuteRequest,
	): Promise<AfterTransactionsExecuteResponse> {
		if (!this._executionContext || !this._executionContext.id.equals(req.contextID)) {
			throw new Error(
				`Invalid context id ${req.contextID.toString(
					'hex',
				)}. Context is not initialized or different.`,
			);
		}

		const context = new BlockContext({
			header: this._executionContext.header,
			logger: this._logger,
			stateStore: this._executionContext.stateStore,
			networkIdentifier: this._executionContext.networkIdentifier,
			assets: new BlockAssets(req.assets),
			eventQueue: new EventQueue(),
			currentValidators: req.consensus.currentValidators,
			impliesMaxPrevote: req.consensus.implyMaxPrevote,
			maxHeightCertified: req.consensus.maxHeightCertified,
			transactions: req.transactions.map(tx => new Transaction(tx)),
		});
		await this._stateMachine.afterExecuteBlock(context);

		return {
			certificateThreshold: context.nextValidators.certificateThreshold,
			nextValidators: context.nextValidators.validators,
			preCommitThreshold: context.nextValidators.precommitThreshold,
			events: context.eventQueue.getEvents().map(e => e.toObject()),
		};
	}

	public async verifyTransaction(
		req: VerifyTransactionRequest,
	): Promise<VerifyTransactionResponse> {
		let stateStore: StateStore;
		let networkIdentifier: Buffer;
		if (!this._executionContext || !this._executionContext.id.equals(req.contextID)) {
			stateStore = new StateStore(this._stateDB);
			networkIdentifier = req.networkIdentifier;
		} else {
			stateStore = this._executionContext.stateStore;
			networkIdentifier = this._executionContext.networkIdentifier;
		}
		const context = new TransactionContext({
			eventQueue: new EventQueue(),
			logger: this._logger,
			transaction: new Transaction(req.transaction),
			stateStore,
			networkIdentifier,
		});
		const result = await this._stateMachine.verifyTransaction(context);

		return {
			result: result.status,
		};
	}

	public async executeTransaction(
		req: ExecuteTransactionRequest,
	): Promise<ExecuteTransactionResponse> {
		let stateStore: StateStore;
		let header: BlockHeader;
		let networkIdentifier: Buffer;
		if (!req.dryRun) {
			if (!this._executionContext || !this._executionContext.id.equals(req.contextID)) {
				throw new Error(
					`Invalid context id ${req.contextID.toString(
						'hex',
					)}. Context is not initialized or different.`,
				);
			}
			stateStore = this._executionContext.stateStore;
			header = this._executionContext.header;
			networkIdentifier = this._executionContext.networkIdentifier;
		} else {
			stateStore = new StateStore(this._stateDB);
			header = new BlockHeader(req.header);
			networkIdentifier = req.networkIdentifier;
		}
		const context = new TransactionContext({
			eventQueue: new EventQueue(),
			logger: this._logger,
			transaction: new Transaction(req.transaction),
			stateStore,
			networkIdentifier,
			assets: new BlockAssets(req.assets),
			header,
		});
		await this._stateMachine.executeTransaction(context);
		return {
			events: context.eventQueue.getEvents().map(e => e.toObject()),
			result: TransactionExecutionResult.OK,
		};
	}

	// TODO: Logic should be re-written with https://github.com/LiskHQ/lisk-sdk/issues/7128
	public async commit(req: CommitRequest): Promise<CommitResponse> {
		if (!this._executionContext || !this._executionContext.id.equals(req.contextID)) {
			throw new Error(
				`Invalid context id ${req.contextID.toString(
					'hex',
				)}. Context is not initialized or different.`,
			);
		}
		const smtStore = new SMTStore(this._stateDB);
		const smt = new SparseMerkleTree({
			db: smtStore,
			rootHash: req.stateRoot,
		});
		const batch = this._stateDB.batch();
		await this._executionContext.stateStore.finalize(batch, smt);
		if (req.dryRun) {
			return {
				stateRoot: smt.rootHash,
			};
		}
		if (req.expectedStateRoot.length > 0 && !req.expectedStateRoot.equals(smt.rootHash)) {
			throw new Error(
				`State root ${smt.rootHash.toString(
					'hex',
				)} does not match with expected state root ${req.expectedStateRoot.toString('hex')}.`,
			);
		}

		await batch.write();
		return {
			stateRoot: smt.rootHash,
		};
	}

	// TODO: Logic should be re-written with https://github.com/LiskHQ/lisk-sdk/issues/7128
	public async revert(req: RevertRequest): Promise<RevertResponse> {
		if (!this._executionContext || !this._executionContext.id.equals(req.contextID)) {
			throw new Error(
				`Invalid context id ${req.contextID.toString(
					'hex',
				)}. Context is not initialized or different.`,
			);
		}
		const heightBuf = formatInt(this._executionContext.header.height);
		const diffKey = concatDBKeys(DB_KEY_DIFF_STATE, heightBuf);

		const stateDiff = await this._stateDB.get(diffKey);

		const {
			created: createdStates,
			updated: updatedStates,
			deleted: deletedStates,
		} = codec.decode<{
			created: Buffer[];
			updated: { key: Buffer; value: Buffer }[];
			deleted: { key: Buffer; value: Buffer }[];
		}>(stateDiffSchema, stateDiff);
		const smtStore = new SMTStore(this._stateDB);
		const smt = new SparseMerkleTree({
			db: smtStore,
			rootHash: req.stateRoot,
		});

		const batch = this._stateDB.batch();
		const SMT_PREFIX_SIZE = 6;
		const toSMTKey = (value: Buffer): Buffer =>
			// First byte is the DB prefix
			Buffer.concat([value.slice(1, SMT_PREFIX_SIZE + 1), hash(value.slice(SMT_PREFIX_SIZE + 1))]);
		// Delete all the newly created states
		for (const key of createdStates) {
			batch.del(key);
			await smt.remove(toSMTKey(key));
		}
		// Revert all deleted values
		for (const { key, value: previousValue } of deletedStates) {
			batch.put(key, previousValue);
			await smt.update(toSMTKey(key), hash(previousValue));
		}
		for (const { key, value: previousValue } of updatedStates) {
			batch.put(key, previousValue);
			await smt.update(toSMTKey(key), hash(previousValue));
		}

		smtStore.finalize(batch);
		// Delete stored diff at particular height
		batch.del(diffKey);
		await batch.write();
		return {
			stateRoot: smt.rootHash,
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async clear(_req: ClearRequest): Promise<ClearResponse> {
		this._executionContext = undefined;
		return {};
	}

	public async finalize(req: FinalizeRequest): Promise<FinalizeResponse> {
		if (req.finalizedHeight === 0) {
			return {};
		}
		await this._stateDB.clear({
			gte: Buffer.concat([concatDBKeys(DB_KEY_DIFF_STATE), formatInt(0)]),
			lte: concatDBKeys(DB_KEY_DIFF_STATE, formatInt(req.finalizedHeight - 1)),
		});
		return {};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getMetadata(_req: MetadataRequest): Promise<MetadataResponse> {
		throw new Error('Method not implemented.');
	}

	public async query(req: QueryRequest): Promise<QueryResponse> {
		const params = JSON.parse(req.params.toString('utf8')) as Record<string, unknown>;
		const resp = await this._channel.invoke(req.method, params);
		return {
			data: Buffer.from(JSON.stringify(resp), 'utf-8'),
		};
	}

	public async prove(req: ProveRequest): Promise<ProveResponse> {
		const smtStore = new SMTStore(this._stateDB);
		const smt = new SparseMerkleTree({
			db: smtStore,
			rootHash: req.stateRoot,
		});
		const proof = await smt.generateMultiProof(req.keys);
		return {
			proof,
		};
	}
}
