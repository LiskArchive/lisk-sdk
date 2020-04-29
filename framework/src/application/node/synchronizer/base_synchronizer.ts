/* eslint-disable class-methods-use-this */
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
import { BlockInstance } from '@liskhq/lisk-chain';
import { Logger, Channel } from '../../../types';

export abstract class BaseSynchronizer {
	protected logger: Logger;
	protected channel: Channel;

	public constructor(logger: Logger, channel: Channel) {
		this.logger = logger;
		this.channel = channel;
	}

	protected async _applyPenaltyAndRestartSync(
		peerId: string,
		receivedBlock: BlockInstance,
		reason: string,
	): Promise<void> {
		this.logger.info(
			{ peerId, reason },
			'Applying penalty to peer and restarting synchronizer',
		);
		await this.channel.invoke('app:applyPenaltyOnPeer', {
			peerId,
			penalty: 100,
		});
		this.channel.publish('app:chain:sync', {
			block: receivedBlock,
		});
	}

	public abstract async run(
		receivedBlock: BlockInstance,
		peerId: string,
	): Promise<void>;
	public abstract async isValidFor(
		receivedBlock: BlockInstance,
		peerId: string,
	): Promise<boolean>;
}
