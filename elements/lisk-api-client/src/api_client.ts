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
import { EventCallback, Channel, RegisteredSchemas, NodeInfo } from './types';
import { Node } from './node';
import { Account } from './account';
import { Block } from './block';
import { Transaction } from './transaction';

export class APIClient {
	private readonly _channel: Channel;
	private _schemas!: RegisteredSchemas;
	private _nodeInfo!: NodeInfo;
	private _node!: Node;
	private _account!: Account;
	private _block!: Block;
	private _transaction!: Transaction;

	public constructor(channel: Channel) {
		this._channel = channel;
	}

	public async init(): Promise<void> {
		this._schemas = await this._channel.invoke<RegisteredSchemas>('app:getSchema');
		this._node = new Node(this._channel);
		this._account = new Account(this._channel, this._schemas);
		this._block = new Block(this._channel, this._schemas);
		this._nodeInfo = await this._node.getNodeInfo();
		this._transaction = new Transaction(this._channel, this._schemas, this._nodeInfo);
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

	public get schemas(): RegisteredSchemas {
		return this._schemas;
	}

	public get node(): Node {
		return this._node;
	}

	public get account(): Account {
		return this._account;
	}

	public get block(): Block {
		return this._block;
	}

	public get transaction(): Transaction {
		return this._transaction;
	}
}
