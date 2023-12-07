/* eslint-disable class-methods-use-this */

import { validator, StateMachine, Modules, utils } from 'lisk-sdk';
import { CreateHelloCommand } from './commands/create_hello_command';
import { ReactCCCommand } from './cc_commands/react_cc_command';
import { HelloEndpoint } from './endpoint';
import { NewHelloEvent } from './events/new_hello';
import { HelloMethod } from './method';
import {
	configSchema,
	getHelloCounterResponseSchema,
	getHelloRequestSchema,
	getHelloResponseSchema,
} from './schemas';
import { CounterStore } from './stores/counter';
import { MessageStore } from './stores/message';
import { ReactionStore, reactionStoreSchema } from './stores/reaction';
import { ModuleConfig } from './types';
import { HelloInteroperableMethod } from './cc_method';

export const defaultConfig = {
	maxMessageLength: 256,
	minMessageLength: 3,
	blacklist: ['illegalWord1'],
};

export class HelloModule extends Modules.Interoperability.BaseInteroperableModule {
	public endpoint = new HelloEndpoint(this.stores, this.offchainStores);
	public method = new HelloMethod(this.stores, this.events);
	public commands = [new CreateHelloCommand(this.stores, this.events)];
	public reactCCCommand = new ReactCCCommand(this.stores, this.events);
	public crossChainMethod = new HelloInteroperableMethod(this.stores, this.events);
	public crossChainCommand = [this.reactCCCommand];

	public constructor() {
		super();
		// registration of stores and events
		this.stores.register(CounterStore, new CounterStore(this.name, 0));
		this.stores.register(MessageStore, new MessageStore(this.name, 1));
		this.stores.register(ReactionStore, new ReactionStore(this.name, 2));
		this.events.register(NewHelloEvent, new NewHelloEvent(this.name));
	}

	public metadata() {
		return {
			endpoints: [
				{
					name: this.endpoint.getHello.name,
					request: getHelloRequestSchema,
					response: getHelloResponseSchema,
				},
				{
					name: this.endpoint.getReactions.name,
					request: getHelloRequestSchema,
					response: reactionStoreSchema,
				},
				{
					name: this.endpoint.getHelloCounter.name,
					response: getHelloCounterResponseSchema,
				},
			],
			commands: this.commands.map(command => ({
				name: command.name,
				params: command.schema,
			})),
			events: this.events.values().map(v => ({
				name: v.name,
				data: v.schema,
			})),
			assets: [],
			stores: [],
		};
	}

	// Lifecycle hooks
	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(args: Modules.ModuleInitArgs): Promise<void> {
		// Get the module config defined in the config.json file
		const { moduleConfig } = args;
		// Overwrite the default module config with values from config.json, if set
		const config: ModuleConfig = utils.objects.mergeDeep(
			{},
			defaultConfig,
			moduleConfig,
		) as ModuleConfig;
		// Validate the provided config with the config schema
		validator.validator.validate<ModuleConfig>(configSchema, config);
		// Call the command init() method with config values as parameters
		this.commands[0].init(config).catch(err => {
			// eslint-disable-next-line no-console
			console.log('Error: ', err);
		});
	}

	public async insertAssets(_context: StateMachine.InsertAssetContext) {
		// initialize block generation, add asset
	}

	public async verifyAssets(_context: StateMachine.BlockVerifyContext): Promise<void> {
		// verify block
	}

	// Lifecycle hooks
	// eslint-disable-next-line @typescript-eslint/require-await
	public async verifyTransaction(
		_context: StateMachine.TransactionVerifyContext,
	): Promise<StateMachine.VerificationResult> {
		// verify transaction will be called multiple times in the transaction pool
		const result = {
			status: StateMachine.VerifyStatus.OK,
		};
		return result;
	}

	public async beforeCommandExecute(
		_context: StateMachine.TransactionExecuteContext,
		// eslint-disable-next-line @typescript-eslint/no-empty-function
	): Promise<void> {}

	public async afterCommandExecute(
		_context: StateMachine.TransactionExecuteContext,
		// eslint-disable-next-line @typescript-eslint/no-empty-function
	): Promise<void> {}

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public async initGenesisState(_context: StateMachine.GenesisBlockExecuteContext): Promise<void> {}

	public async finalizeGenesisState(
		_context: StateMachine.GenesisBlockExecuteContext,
		// eslint-disable-next-line @typescript-eslint/no-empty-function
	): Promise<void> {}

	public async beforeTransactionsExecute(
		_context: StateMachine.BlockExecuteContext,
		// eslint-disable-next-line @typescript-eslint/no-empty-function
	): Promise<void> {}

	public async afterTransactionsExecute(
		_context: StateMachine.BlockAfterExecuteContext,
		// eslint-disable-next-line @typescript-eslint/no-empty-function
	): Promise<void> {}
}
