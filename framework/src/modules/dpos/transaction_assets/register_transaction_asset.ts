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
import { ApplyAssetInput, ValidateAssetInput } from '../../../types';
import { ValidationError } from '../../../errors';
import { DELEGATE_NAME_FEE } from '../constants';
import { getRegisteredDelegates, setRegisteredDelegates } from '../utils';
import { DPOSAccountProps } from '../types';

const isNullCharacterIncluded = (input: string): boolean =>
	new RegExp(/\\0|\\u0000|\\x00/).test(input);

const isUsername = (username: string): boolean => {
	if (isNullCharacterIncluded(username)) {
		return false;
	}

	if (username !== username.trim().toLowerCase()) {
		return false;
	}

	if (/^[0-9]{1,21}[L|l]$/g.test(username)) {
		return false;
	}

	return /^[a-z0-9!@$&_.]+$/g.test(username);
};

export interface RegisterTransactionAssetInput {
	readonly username: string;
}

export class RegisterTransactionAsset extends BaseAsset<RegisterTransactionAssetInput> {
	public baseFee = DELEGATE_NAME_FEE;
	public name = 'register';
	public type = 0;
	public assetSchema = {
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
	public validateAsset({ asset }: ValidateAssetInput<RegisterTransactionAssetInput>): void {
		if (!isUsername(asset.username)) {
			throw new ValidationError('The username is in unsupported format', asset.username);
		}
	}

	// eslint-disable-next-line class-methods-use-this
	public async applyAsset({
		asset,
		senderID,
		stateStore,
	}: ApplyAssetInput<RegisterTransactionAssetInput>): Promise<void> {
		const sender = await stateStore.account.get<DPOSAccountProps>(senderID);

		if (sender.dpos.delegate.username) {
			throw new Error('Account is already a delegate');
		}

		const usernames = await getRegisteredDelegates(stateStore);
		const usernameExists = usernames.registeredDelegates.find(
			delegate => delegate.username === asset.username,
		);

		if (!usernameExists) {
			usernames.registeredDelegates.push({
				username: asset.username,
				address: senderID,
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
