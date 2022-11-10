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

import { BaseMethod } from '..';
import {
	BeforeApplyCCMsgMethodContext,
	BeforeSendCCMsgMethodContext,
	BeforeRecoverCCMsgMethodContext,
	RecoverCCMsgMethodContext,
	CrossChainMessageContext,
} from './types';

export abstract class BaseInteroperableMethod extends BaseMethod {
	public beforeApplyCCM?(ctx: BeforeApplyCCMsgMethodContext): Promise<void>;
	public beforeSendCCM?(ctx: BeforeSendCCMsgMethodContext): Promise<void>;
	public beforeRecoverCCM?(ctx: BeforeRecoverCCMsgMethodContext): Promise<void>;
	public recover?(ctx: RecoverCCMsgMethodContext): Promise<void>;
	public verifyCrossChainMessage?(ctx: CrossChainMessageContext): Promise<void>;
	public beforeCrossChainCommandExecute?(ctx: CrossChainMessageContext): Promise<void>;
	public afterCrossChainCommandExecute?(ctx: CrossChainMessageContext): Promise<void>;
	public beforeCrossChainMessageForwarding?(ctx: CrossChainMessageContext): Promise<void>;
}
