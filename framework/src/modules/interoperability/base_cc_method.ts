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

import { BaseMethod } from '../base_method';
import { BeforeCCMForwardingContext, CrossChainMessageContext, RecoverContext } from './types';

/**
 * The BaseCCMethod represents Lisk module methods with cross-chain relations.
 */
export abstract class BaseCCMethod extends BaseMethod {
	public beforeRecoverCCM?(ctx: CrossChainMessageContext): Promise<void>;
	public recover?(ctx: RecoverContext): Promise<void>;
	public verifyCrossChainMessage?(ctx: CrossChainMessageContext): Promise<void>;
	public beforeCrossChainCommandExecute?(ctx: CrossChainMessageContext): Promise<void>;

	public afterCrossChainCommandExecute?(ctx: CrossChainMessageContext): Promise<void>;
	public beforeCrossChainMessageForwarding?(ctx: BeforeCCMForwardingContext): Promise<void>;
}
