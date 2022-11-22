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

import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../state_machine';
import { BaseCommand } from '../../base_command';
import { EMPTY_KEY, MODULE_NAME_POS } from '../constants';
import { ValidatorStore } from '../stores/validator';
import { GenesisDataStore } from '../stores/genesis';
import { StakerStore } from '../stores/staker';
import { TokenMethod, TokenID, UnlockCommandDependencies } from '../types';
import { isPunished, isCertificateGenerated, hasWaited } from '../utils';

export class UnlockCommand extends BaseCommand {
	private _tokenMethod!: TokenMethod;
	private _posTokenID!: TokenID;
	private _roundLength!: number;

	public addDependencies(args: UnlockCommandDependencies) {
		this._tokenMethod = args.tokenMethod;
	}

	public init(args: { posTokenID: TokenID; roundLength: number }) {
		this._posTokenID = args.posTokenID;
		this._roundLength = args.roundLength;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(context: CommandVerifyContext): Promise<VerificationResult> {
		const { transaction } = context;

		if (transaction.params.length !== 0) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Unlock transaction params must be empty.'),
			};
		}

		return {
			status: VerifyStatus.OK,
		};
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
			const { pomHeights } = await validatorSubstore.get(context, unlockObject.validatorAddress);

			if (
				hasWaited(unlockObject, senderAddress, height) &&
				!isPunished(unlockObject, pomHeights, senderAddress, height) &&
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
