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
import { EventEmitter } from 'events';
import { BlockAssets, BlockHeader, SMTStore, StateStore, Transaction } from '@liskhq/lisk-chain';
import { StateDB, Database } from '@liskhq/lisk-db';
import { codec } from '@liskhq/lisk-codec';
import { utils } from '@liskhq/lisk-cryptography';
import { SparseMerkleTree } from '@liskhq/lisk-tree';
import {
	ABI,
	blockHeaderSchema,
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
	ReadyRequest,
	ReadyResponse,
} from '../abi';
import { Logger } from '../logger';
import { BaseModule } from '../modules';
import {
	BlockContext,
	EventQueue,
	GenesisBlockContext,
	StateMachine,
	TransactionContext,
} from '../state_machine';
import { ApplicationConfig } from '../types';
import { GenerationContext } from '../state_machine/generator_context';
import { BaseChannel } from '../controller/channels';
import { PrefixedStateReadWriter } from '../state_machine/prefixed_state_read_writer';
import { readGenesisBlock } from '../utils/genesis_block';

export interface ABIHandlerConstructor {
	config: ApplicationConfig;
	logger: Logger;
	stateMachine: StateMachine;
	stateDB: StateDB;
	moduleDB: Database;
	modules: BaseModule[];
	channel: BaseChannel;
}

interface ExecutionContext {
	id: Buffer;
	header: BlockHeader;
	stateStore: PrefixedStateReadWriter;
	moduleStore: StateStore;
}

export const EVENT_ENGINE_READY = 'EVENT_ENGINE_READY';

export class ABIHandler implements ABI {
	public readonly event = new EventEmitter();

	private readonly _logger: Logger;
	private readonly _stateMachine: StateMachine;
	private readonly _stateDB: StateDB;
	private readonly _moduleDB: Database;
	private readonly _modules: BaseModule[];
	private readonly _channel: BaseChannel;
	private readonly _config: ApplicationConfig;

	private _executionContext: ExecutionContext | undefined;
	private _chainID?: Buffer;

	public constructor(args: ABIHandlerConstructor) {
		this._config = args.config;
		this._logger = args.logger;
		this._stateMachine = args.stateMachine;
		this._stateDB = args.stateDB;
		this._moduleDB = args.moduleDB;
		this._modules = args.modules;
		this._channel = args.channel;
	}

	public get chainID(): Buffer {
		if (!this._chainID) {
			throw new Error('Network identifier is not set.');
		}
		return this._chainID;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async ready(_req: ReadyRequest): Promise<ReadyResponse> {
		this._chainID = Buffer.from(this._config.genesis.chainID, 'hex');

		this.event.emit(EVENT_ENGINE_READY);
		return {};
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
		const id = utils.hash(codec.encode(blockHeaderSchema, req.header));
		this._executionContext = {
			id,
			header: new BlockHeader(req.header),
			stateStore: new PrefixedStateReadWriter(this._stateDB.newReadWriter()),
			moduleStore: new StateStore(this._moduleDB),
		};
		return {
			contextID: id,
		};
	}

	public async initGenesisState(req: InitGenesisStateRequest): Promise<InitGenesisStateResponse> {
		if (!this._executionContext || !this._executionContext.id.equals(req.contextID)) {
			throw new Error(
				`Invalid context id ${req.contextID.toString(
					'hex',
				)}. Context is not initialized or different.`,
			);
		}
		const genesisBlock = readGenesisBlock(this._config, this._logger);
		const context = new GenesisBlockContext({
			eventQueue: new EventQueue(genesisBlock.header.height),
			header: genesisBlock.header,
			logger: this._logger,
			stateStore: this._executionContext.stateStore,
			assets: genesisBlock.assets,
		});

		await this._stateMachine.executeGenesisBlock(context);
		return {
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
			chainID: this.chainID,
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
			chainID: this.chainID,
			assets: new BlockAssets(req.assets),
			eventQueue: new EventQueue(this._executionContext.header.height),
			// verifyAssets does not have access to transactions
			transactions: [],
			// verifyAssets does not have access to those properties
			currentValidators: [],
			impliesMaxPrevote: false,
			maxHeightCertified: 0,
			certificateThreshold: BigInt(0),
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
			chainID: this.chainID,
			assets: new BlockAssets(req.assets),
			eventQueue: new EventQueue(this._executionContext.header.height),
			currentValidators: req.consensus.currentValidators,
			impliesMaxPrevote: req.consensus.implyMaxPrevote,
			maxHeightCertified: req.consensus.maxHeightCertified,
			certificateThreshold: req.consensus.certificateThreshold,
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
			chainID: this.chainID,
			assets: new BlockAssets(req.assets),
			eventQueue: new EventQueue(this._executionContext.header.height),
			currentValidators: req.consensus.currentValidators,
			impliesMaxPrevote: req.consensus.implyMaxPrevote,
			maxHeightCertified: req.consensus.maxHeightCertified,
			certificateThreshold: req.consensus.certificateThreshold,
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
		let stateStore: PrefixedStateReadWriter;
		if (!this._executionContext || !this._executionContext.id.equals(req.contextID)) {
			stateStore = new PrefixedStateReadWriter(this._stateDB.newReadWriter());
		} else {
			stateStore = this._executionContext.stateStore;
		}
		const context = new TransactionContext({
			eventQueue: new EventQueue(0),
			logger: this._logger,
			transaction: new Transaction(req.transaction),
			stateStore,
			chainID: this.chainID,
			// These values are not used
			currentValidators: [],
			impliesMaxPrevote: true,
			maxHeightCertified: 0,
			certificateThreshold: BigInt(0),
		});
		const result = await this._stateMachine.verifyTransaction(context);

		return {
			result: result.status,
		};
	}

	public async executeTransaction(
		req: ExecuteTransactionRequest,
	): Promise<ExecuteTransactionResponse> {
		let stateStore: PrefixedStateReadWriter;
		let header: BlockHeader;
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
		} else {
			stateStore = new PrefixedStateReadWriter(this._stateDB.newReadWriter());
			header = new BlockHeader(req.header);
		}
		const context = new TransactionContext({
			eventQueue: new EventQueue(header.height),
			logger: this._logger,
			transaction: new Transaction(req.transaction),
			stateStore,
			chainID: this.chainID,
			assets: new BlockAssets(req.assets),
			header,
			currentValidators: req.consensus.currentValidators,
			impliesMaxPrevote: req.consensus.implyMaxPrevote,
			maxHeightCertified: req.consensus.maxHeightCertified,
			certificateThreshold: req.consensus.certificateThreshold,
		});
		const status = await this._stateMachine.executeTransaction(context);
		return {
			events: context.eventQueue.getEvents().map(e => e.toObject()),
			result: status,
		};
	}

	public async commit(req: CommitRequest): Promise<CommitResponse> {
		if (!this._executionContext || !this._executionContext.id.equals(req.contextID)) {
			throw new Error(
				`Invalid context id ${req.contextID.toString(
					'hex',
				)}. Context is not initialized or different.`,
			);
		}
		const stateRoot = await this._stateDB.commit(
			this._executionContext.stateStore.inner,
			this._executionContext.header.height,
			req.stateRoot,
			{
				checkRoot: req.expectedStateRoot.length > 0,
				readonly: req.dryRun,
				expectedRoot: req.expectedStateRoot as never,
			},
		);
		return {
			stateRoot,
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
		const stateRoot = await this._stateDB.revert(
			req.stateRoot,
			this._executionContext.header.height,
		);
		return {
			stateRoot,
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
		await this._stateDB.finalize(req.finalizedHeight);
		return {};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getMetadata(_req: MetadataRequest): Promise<MetadataResponse> {
		const modules = this._modules.map(mod => {
			const meta = mod.metadata();
			return {
				...meta,
				name: mod.name,
			};
		});
		modules.sort((a, b) => a.name.localeCompare(b.name, 'en'));
		const data = Buffer.from(JSON.stringify({ modules }), 'utf-8');
		return {
			data,
		};
	}

	public async query(req: QueryRequest): Promise<QueryResponse> {
		const params = JSON.parse(req.params.toString('utf8')) as Record<string, unknown>;
		try {
			const resp = await this._channel.invoke(req.method, params);
			this._logger.info({ method: req.method }, 'Called ABI query successfully');
			return {
				data: Buffer.from(JSON.stringify(resp), 'utf-8'),
			};
		} catch (error) {
			this._logger.info({ method: req.method, err: error as Error }, 'Failed to call ABI query');
			return {
				data: Buffer.from(
					JSON.stringify({
						error: {
							message: (error as Error).message,
						},
					}),
					'utf-8',
				),
			};
		}
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
