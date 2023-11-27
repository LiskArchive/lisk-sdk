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

import { BaseModule } from '../base_module';
import { BaseCCCommand } from './base_cc_command';
import { BaseCCMethod } from './base_cc_method';

/**
 * The BaseInteroperableModule represents Lisk modules with cross-chain commands by providing a generic interface, from which each interoperable module extends from.
 */
export abstract class BaseInteroperableModule extends BaseModule {
	/** A list of the cross-chain commands of the module */
	public crossChainCommand: BaseCCCommand[] = [];
	/** Methods related to cross-chain communication */
	public abstract crossChainMethod: BaseCCMethod;
}
