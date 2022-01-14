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

import { CommandExecuteContext } from '../../../node/state_machine/types';
import { BaseCommand } from '../../base_command';
import {
	COMMAND_ID_UNLOCK,
	defaultConfig,
	EMPTY_KEY,
	STORE_PREFIX_DELEGATE,
	STORE_PREFIX_GENESIS_DATA,
	STORE_PREFIX_VOTER,
	MODULE_ID_DPOS,
} from '../constants';
import { delegateStoreSchema, genesisDataStoreSchema, voterStoreSchema } from '../schemas';
import {
	BFTAPI,
	DelegateAccount,
	GenesisData,
	TokenAPI,
	TokenIDDPoS,
	UnlockCommandDependencies,
	VoterData,
} from '../types';
import { hasWaited, isPunished, isCertificateGenerated } from '../utils';

export class UnlockCommand extends BaseCommand {
	public id = COMMAND_ID_UNLOCK;
	public name = 'unlockToken';

	private _bftAPI!: BFTAPI;
	private _tokenAPI!: TokenAPI;
	private _tokenIDDPoS!: TokenIDDPoS;

	public addDependencies(args: UnlockCommandDependencies) {
		this._bftAPI = args.bftAPI;
		this._tokenAPI = args.tokenAPI;
		this._tokenIDDPoS = args.tokenIDDPoS;
	}

	public async execute(context: CommandExecuteContext): Promise<void> {
		const {
			transaction: { senderAddress },
			getStore,
			getAPIContext,
			header: { height },
		} = context;
		const delegateSubstore = getStore(this.moduleID, STORE_PREFIX_DELEGATE);
		const voterSubstore = getStore(this.moduleID, STORE_PREFIX_VOTER);
		const voterData = await voterSubstore.getWithSchema<VoterData>(senderAddress, voterStoreSchema);
		const ineligibleUnlocks = [];
		const genesisDataStore = context.getStore(MODULE_ID_DPOS, STORE_PREFIX_GENESIS_DATA);
		const genesisData = await genesisDataStore.getWithSchema<GenesisData>(
			EMPTY_KEY,
			genesisDataStoreSchema,
		);
		const { height: genesisHeight } = genesisData;
		const { maxHeightCertified } = await this._bftAPI.getBFTHeights(getAPIContext());

		for (const unlockObject of voterData.pendingUnlocks) {
			const { pomHeights } = await delegateSubstore.getWithSchema<DelegateAccount>(
				unlockObject.delegateAddress,
				delegateStoreSchema,
			);

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
					MODULE_ID_DPOS,
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
		await voterSubstore.setWithSchema(senderAddress, voterData, voterStoreSchema);
	}
}
