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
 */

import * as os from 'os';
import * as _ from 'lodash';
import * as assert from 'assert';
import { Logger } from './logger';
import { BaseChannel } from '../controller/channels';

interface State {
	[key: string]: number | string | object;
}

interface ApplicationStateConstructor {
	readonly initialState: {
		readonly version: string;
		readonly wsPort: number;
		readonly protocolVersion: string;
		readonly networkId: string;
	};
	readonly logger: Logger;
}

interface ApplicationStateUpdate {
	readonly height: number;
	readonly maxHeightPrevoted?: number;
	readonly lastBlockId?: string;
	readonly blockVersion?: number;
}

export class ApplicationState {
	private _state: State;
	private readonly _logger: Logger;
	private _channel!: BaseChannel;

	public constructor({
		initialState: { version, wsPort, protocolVersion, networkId },
		logger,
	}: ApplicationStateConstructor) {
		this._logger = logger;
		this._state = {
			os: os.platform() + os.release(),
			version,
			wsPort,
			protocolVersion,
			height: 1,
			blockVersion: 0,
			maxHeightPrevoted: 0,
			networkId,
		};
	}

	public get state(): State {
		return _.cloneDeep(this._state);
	}

	public set channel(channel: BaseChannel) {
		this._channel = channel;
	}

	public update({
		height,
		maxHeightPrevoted = this.state.maxHeightPrevoted as number,
		lastBlockId = this.state.lastBlockId as string,
		blockVersion = this.state.blockVersion as number,
	}: ApplicationStateUpdate): void {
		assert(height, 'height is required to update application state.');
		try {
			const newState = this.state;
			newState.maxHeightPrevoted = maxHeightPrevoted;
			newState.lastBlockId = lastBlockId;
			newState.height = height;
			newState.blockVersion = blockVersion;
			this._state = newState;
			this._logger.debug(this.state, 'Update application state');
			this._channel.publish('app:state:updated', this.state);
		} catch (err) {
			this._logger.error(
				{ err: err as Error },
				'Failed to update application state',
			);
			throw err;
		}
	}
}
