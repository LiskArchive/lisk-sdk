/*
 * Copyright © 2022 Lisk Foundation
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

import { BaseCommand } from '../../../base_command';
import { COMMAND_ID_SIDECHAIN_REG } from '../../constants';
import { sidechainRegParams } from '../../schema';
import { VerificationResult } from '../../../../node/state_machine';

export class SidechainRegistrationCommand extends BaseCommand {
	public id = COMMAND_ID_SIDECHAIN_REG;
	public name = 'sidechainRegistration';
	public schema = sidechainRegParams;

	// TODO
	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(): Promise<VerificationResult> {
		throw new Error('Method not implemented.');
	}

	// TODO
	// eslint-disable-next-line @typescript-eslint/require-await
	public async execute(): Promise<void> {
		throw new Error('Method not implemented.');
	}
}
