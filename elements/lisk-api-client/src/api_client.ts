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
import { Node } from './node';
import { Block } from './block';
import { Transaction } from './transaction';
import { Event } from './event';

export class APIClient {
	private readonly _channel: Channel;
	private _schema!: RegisteredSchemas;
	private _metadata!: ModuleMetadata[];
	private _nodeInfo!: NodeInfo;
	private _node!: Node;
	private _block!: Block;
	private _transaction!: Transaction;
	private _event!: Event;

	public constructor(channel: Channel) {
		this._channel = channel;
	}

	public async init(): Promise<void> {
		const { modules } = await this._channel.invoke<{ modules: ModuleMetadata[] }>(
			'system_getMetadata',
		);
		this._metadata = modules;
		this._schema = await this._channel.invoke<RegisteredSchemas>('system_getSchema');
		this._node = new Node(this._channel);
		this._block = new Block(this._channel, this._schema, this._metadata);
		this._nodeInfo = await this._node.getNodeInfo();
		this._transaction = new Transaction(
			this._channel,
			this._schema,
			this._metadata,
			this._nodeInfo,
		);
		this._event = new Event(this._channel, this._metadata);
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

	public get node(): Node {
		return this._node;
	}

	public get block(): Block {
		return this._block;
	}

	public get transaction(): Transaction {
		return this._transaction;
	}

	public get event(): Event {
		return this._event;
	}
}
