import { BasePlugin, PluginInitContext } from 'lisk-sdk';

import { Mainchain } from './Mainchain';
import { RecoveryPluginConfig } from './types';
import { MessageRecoveryDb } from './db/MessageRecoveryDb';
import { StateRecoveryDB } from './db/StateRecoveryDb';
import { getDBInstance } from './db/db';
import { Endpoint } from './endpoint';
import { Sidechain } from './Sidechain';

export class RecoveryPlugin extends BasePlugin<RecoveryPluginConfig> {
	//
	public endpoint = new Endpoint();
	private _messageRecoveryDb!: MessageRecoveryDb;
	private _stateRecoveryDb!: StateRecoveryDB;

	private readonly _mainchain: Mainchain;
	private readonly _sidechain: Sidechain;

	public constructor() {
		super();

		this._mainchain = new Mainchain();
		this._sidechain = new Sidechain();
	}

	public async init(context: PluginInitContext): Promise<void> {
		await super.init(context);

		this._messageRecoveryDb = new MessageRecoveryDb(await getDBInstance());
		this._stateRecoveryDb = new StateRecoveryDB(await getDBInstance());

		// same instances of `this._messageRecoveryDb` & `this._stateRecoveryDb` are passed to Sidechain
		await this._mainchain.init(this.config, this._messageRecoveryDb, this._stateRecoveryDb);
	}

	public async load(): Promise<void> {
		this.endpoint.load(
			this.config,
			this._mainchain,
			this._messageRecoveryDb,
			this._stateRecoveryDb,
		);
	}

	public async unload(): Promise<void> {
		await this._mainchain.disconnect();
		await this._sidechain.disconnect();
	}

	public get nodeModulePath(): string {
		return __filename;
	}
}
