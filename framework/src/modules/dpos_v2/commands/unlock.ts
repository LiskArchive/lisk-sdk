/*
 * Copyright © 2021 Lisk Foundation
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

import { CommandExecuteContext } from '../../../state_machine/types';
import { BaseCommand } from '../../base_command';
import { defaultConfig, EMPTY_KEY, MODULE_NAME_DPOS } from '../constants';
import { DelegateStore } from '../stores/delegate';
import { GenesisDataStore } from '../stores/genesis';
import { VoterStore } from '../stores/voter';
import { TokenAPI, TokenIDDPoS, UnlockCommandDependencies } from '../types';
import { hasWaited, isPunished, isCertificateGenerated } from '../utils';

export class UnlockCommand extends BaseCommand {
	private _tokenAPI!: TokenAPI;
	private _tokenIDDPoS!: TokenIDDPoS;

	public addDependencies(args: UnlockCommandDependencies) {
		this._tokenAPI = args.tokenAPI;
	}

	public init(args: { tokenIDDPoS: TokenIDDPoS }) {
		this._tokenIDDPoS = args.tokenIDDPoS;
	}

	public async execute(context: CommandExecuteContext): Promise<void> {
		const {
			transaction: { senderAddress },
			getAPIContext,
			maxHeightCertified,
			header: { height },
		} = context;
		const delegateSubstore = this.stores.get(DelegateStore);
		const voterSubstore = this.stores.get(VoterStore);
		const voterData = await voterSubstore.get(context, senderAddress);
		const ineligibleUnlocks = [];
		const genesisDataStore = this.stores.get(GenesisDataStore);
		const genesisData = await genesisDataStore.get(context, EMPTY_KEY);
		const { height: genesisHeight } = genesisData;

		for (const unlockObject of voterData.pendingUnlocks) {
			const { pomHeights } = await delegateSubstore.get(context, unlockObject.delegateAddress);

			if (
				hasWaited(unlockObject, senderAddress, height) &&
				!isPunished(unlockObject, pomHeights, senderAddress, height) &&
				isCertificateGenerated({
					unlockObject,
					genesisHeight,
					maxHeightCertified,
					roundLength: defaultConfig.roundLength,
				})
			) {
				await this._tokenAPI.unlock(
					getAPIContext(),
					senderAddress,
					MODULE_NAME_DPOS,
					this._tokenIDDPoS,
					unlockObject.amount,
				);
				continue;
			}
			ineligibleUnlocks.push(unlockObject);
		}
		if (voterData.pendingUnlocks.length === ineligibleUnlocks.length) {
			throw new Error('No eligible voter data was found for unlocking');
		}
		voterData.pendingUnlocks = ineligibleUnlocks;
		await voterSubstore.set(context, senderAddress, voterData);
	}
}
