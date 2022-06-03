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

import { BaseAPI } from '..';
import {
	BeforeApplyCCMsgAPIContext,
	BeforeSendCCMsgAPIContext,
	BeforeRecoverCCMsgAPIContext,
	RecoverCCMsgAPIContext,
} from './types';

export abstract class BaseInteroperableAPI extends BaseAPI {
	public beforeApplyCCM?(ctx: BeforeApplyCCMsgAPIContext): Promise<void>;
	public beforeSendCCM?(ctx: BeforeSendCCMsgAPIContext): Promise<void>;
	public beforeRecoverCCM?(ctx: BeforeRecoverCCMsgAPIContext): Promise<void>;
	public recover?(ctx: RecoverCCMsgAPIContext): Promise<void>;
}
