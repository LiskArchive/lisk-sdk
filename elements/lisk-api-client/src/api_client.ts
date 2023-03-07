/*
 * Copyright © 2019 Lisk Foundation
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
 *
 */
import { EventCallback, Channel, RegisteredSchemas, NodeInfo, ModuleMetadata } from './types';
import { NodeMethods } from './node_methods';
import { BlockMethods } from './block_methods';
import { TransactionMethods } from './transaction_methods';
import { EventMethods } from './event_methods';

export class APIClient {
	private readonly _channel: Channel;
	private _schema!: RegisteredSchemas;
	private _metadata!: ModuleMetadata[];
	private _nodeInfo!: NodeInfo;
	private _nodeMethods!: NodeMethods;
	private _blockMethods!: BlockMethods;
	private _transactionMethods!: TransactionMethods;
	private _eventMethods!: EventMethods;

	public constructor(channel: Channel) {
		this._channel = channel;
	}

	public async init(): Promise<void> {
		const { modules } = await this._channel.invoke<{ modules: ModuleMetadata[] }>(
			'system_getMetadata',
		);
		this._metadata = modules;
		this._schema = await this._channel.invoke<RegisteredSchemas>('system_getSchema');
		this._nodeMethods = new NodeMethods(this._channel);
		this._blockMethods = new BlockMethods(this._channel, this._schema, this._metadata);
		this._nodeInfo = await this._nodeMethods.getNodeInfo();
		this._transactionMethods = new TransactionMethods(
			this._channel,
			this._schema,
			this._metadata,
			this._nodeInfo,
		);
		this._eventMethods = new EventMethods(this._channel, this._metadata);
	}

	public async disconnect(): Promise<void> {
		return this._channel.disconnect();
	}

	public async invoke<T = Record<string, unknown>>(
		actionName: string,
		params?: Record<string, unknown>,
	): Promise<T> {
		return this._channel.invoke(actionName, params);
	}

	public subscribe(eventName: string, cb: EventCallback): void {
		this._channel.subscribe(eventName, cb);
	}

	public get schema(): RegisteredSchemas {
		return this._schema;
	}

	public get metadata(): ModuleMetadata[] {
		return this._metadata;
	}

	public get node(): NodeMethods {
		return this._nodeMethods;
	}

	public get block(): BlockMethods {
		return this._blockMethods;
	}

	public get transaction(): TransactionMethods {
		return this._transactionMethods;
	}

	public get event(): EventMethods {
		return this._eventMethods;
	}
}
