/*
 * Copyright © 2020 Lisk Foundation
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

import { BaseAsset } from '../../base_asset';
import { ApplyAssetContext, ValidateAssetContext } from '../../../types';
import { ValidationError } from '../../../errors';
import { isUsername } from '../utils';
import { DPOSAccountProps, RegisterTransactionAssetContext } from '../types';
import { getRegisteredDelegates, setRegisteredDelegates } from '../data_access';

export class RegisterTransactionAsset extends BaseAsset<RegisterTransactionAssetContext> {
	public name = 'register';
	public id = 0;
	public schema = {
		$id: 'lisk/dpos/register',
		type: 'object',
		required: ['username'],
		properties: {
			username: {
				dataType: 'string',
				fieldNumber: 1,
				minLength: 1,
				maxLength: 20,
			},
		},
	};

	// eslint-disable-next-line class-methods-use-this
	public validate({ asset }: ValidateAssetContext<RegisterTransactionAssetContext>): void {
		if (!isUsername(asset.username)) {
			throw new ValidationError('The username is in unsupported format', asset.username);
		}
	}

	// eslint-disable-next-line class-methods-use-this
	public async apply({
		asset,
		senderAddress,
		stateStore,
	}: ApplyAssetContext<RegisterTransactionAssetContext>): Promise<void> {
		const sender = await stateStore.account.get<DPOSAccountProps>(senderAddress);

		if (sender.dpos.delegate.username !== '') {
			throw new Error('Account is already a delegate');
		}

		const usernames = await getRegisteredDelegates(stateStore);
		const usernameExists = usernames.registeredDelegates.find(
			delegate => delegate.username === asset.username,
		);

		if (!usernameExists) {
			usernames.registeredDelegates.push({
				username: asset.username,
				address: senderAddress,
			});

			setRegisteredDelegates(stateStore, usernames);
		}

		if (usernameExists) {
			throw new Error('Username is not unique');
		}

		sender.dpos.delegate.username = asset.username;
		sender.dpos.delegate.lastForgedHeight = stateStore.chain.lastBlockHeaders[0].height + 1;
		stateStore.account.set<DPOSAccountProps>(sender.address, sender);
	}
}
