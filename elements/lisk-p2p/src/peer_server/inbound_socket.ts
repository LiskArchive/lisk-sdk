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

import { EventEmitter } from 'events';

import { SocketInfo } from '../types';

import { MasterServer } from './master';

type States = 'connecting' | 'open' | 'closed';

export class InboundSocket extends EventEmitter {
	private readonly _id: string;
	private readonly _ipAddress: string;
	private readonly _wsPort: number;
	private readonly _info: SocketInfo;
	private readonly _workerId: number;
	private readonly _masterServer: MasterServer;
	public readonly state: States;
	public readonly OPEN = 'open';
	public readonly CLOSED = 'closed';

	public constructor(
		masterServer: MasterServer,
		workerId: number,
		socketInfo: SocketInfo,
	) {
		super();
		this.state = 'open';
		this._workerId = workerId;
		this._id = socketInfo.id;
		this._ipAddress = socketInfo.ipAddress;
		this._wsPort = socketInfo.wsPort;
		this._masterServer = masterServer;
		this._info = socketInfo;
	}

	public get id(): string {
		return this._id;
	}

	public get wsPort(): number {
		return this._wsPort;
	}

	public get ipAddress(): string {
		return this._ipAddress;
	}

	public get info(): SocketInfo {
		return this._info;
	}

	public emit(event: string, ...args: any[]): boolean {
		this._masterServer.sendToWorker(this._workerId, {
			type: event,
			data: { ...args },
		});

		return true;
	}

	public emitFromWorker(
		event: string,
		data: unknown,
		callback?: (err: Error, resp: any) => void,
	): boolean {
		return super.emit(event, data, callback);
	}

	public destroy(statusCode: number, reason: string | undefined): void {
		this._masterServer.disconnect(
			this._workerId,
			this._id,
			statusCode,
			reason || 'Unknown reason',
		);
	}

	public disconnect(statusCode: number, reason: string): void {
		this._masterServer.disconnect(this._workerId, this._id, statusCode, reason);
	}
}
