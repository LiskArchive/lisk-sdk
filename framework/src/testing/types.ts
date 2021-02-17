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
 *
 */

import { Account, AccountDefaultProps } from '@liskhq/lisk-chain';
import { GenesisConfig } from '..';
import { BaseModule } from '../modules';

export type ModuleClass = new (genesisConfig: GenesisConfig) => BaseModule;
export type PartialAccount<T = AccountDefaultProps> = Partial<Account<T>> & { address: Buffer };
