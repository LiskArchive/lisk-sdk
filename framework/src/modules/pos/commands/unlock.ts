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

import { CommandExecuteContext } from '../../../state_machine';
import { BaseCommand } from '../../base_command';
import { EMPTY_KEY, MODULE_NAME_POS } from '../constants';
import { ValidatorStore } from '../stores/validator';
import { GenesisDataStore } from '../stores/genesis';
import { StakerStore } from '../stores/staker';
import {
	TokenMethod,
	TokenID,
	UnlockCommandDependencies,
	PunishmentLockingPeriods,
} from '../types';
import { isPunished, isCertificateGenerated, hasWaited } from '../utils';

export class UnlockCommand extends BaseCommand {
	private _tokenMethod!: TokenMethod;
	private _posTokenID!: TokenID;
	private _roundLength!: number;
	private _punishmentLockingPeriods!: PunishmentLockingPeriods;

	public addDependencies(args: UnlockCommandDependencies) {
		this._tokenMethod = args.tokenMethod;
	}

	public init(args: {
		posTokenID: TokenID;
		roundLength: number;
		punishmentLockingPeriods: PunishmentLockingPeriods;
	}) {
		this._posTokenID = args.posTokenID;
		this._roundLength = args.roundLength;
		this._punishmentLockingPeriods = args.punishmentLockingPeriods;
	}

	public async execute(context: CommandExecuteContext): Promise<void> {
		const {
			transaction: { senderAddress },
			getMethodContext,
			header: { height, aggregateCommit },
		} = context;
		const validatorSubstore = this.stores.get(ValidatorStore);
		const stakerSubstore = this.stores.get(StakerStore);
		const stakerData = await stakerSubstore.get(context, senderAddress);
		const ineligibleUnlocks = [];
		const genesisDataStore = this.stores.get(GenesisDataStore);
		const genesisData = await genesisDataStore.get(context, EMPTY_KEY);
		const { height: genesisHeight } = genesisData;

		for (const unlockObject of stakerData.pendingUnlocks) {
			const { reportMisbehaviorHeights } = await validatorSubstore.get(
				context,
				unlockObject.validatorAddress,
			);

			if (
				hasWaited(unlockObject, senderAddress, height, this._punishmentLockingPeriods) &&
				!isPunished(
					unlockObject,
					reportMisbehaviorHeights,
					senderAddress,
					height,
					this._punishmentLockingPeriods,
				) &&
				isCertificateGenerated({
					unlockObject,
					genesisHeight,
					maxHeightCertified: aggregateCommit.height,
					roundLength: this._roundLength,
				})
			) {
				await this._tokenMethod.unlock(
					getMethodContext(),
					senderAddress,
					MODULE_NAME_POS,
					this._posTokenID,
					unlockObject.amount,
				);
				continue;
			}
			ineligibleUnlocks.push(unlockObject);
		}
		if (stakerData.pendingUnlocks.length === ineligibleUnlocks.length) {
			throw new Error('No eligible staker data was found for unlocking');
		}
		stakerData.pendingUnlocks = ineligibleUnlocks;
		await stakerSubstore.set(context, senderAddress, stakerData);
	}
}
