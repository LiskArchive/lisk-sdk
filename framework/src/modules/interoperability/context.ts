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

import {
	BeforeApplyCCMsgAPIContext,
	BeforeSendCCMsgAPIContext,
	CCAPIContext,
	CCCommandExecuteContext,
	CCUpdateParams,
} from './types';

export const createCCCommandExecuteContext = (params: CCAPIContext): CCCommandExecuteContext => ({
	logger: params.logger,
	networkIdentifier: params.networkIdentifier,
	eventQueue: params.eventQueue,
	getAPIContext: params.getAPIContext,
	getStore: params.getStore,
	ccm: params.ccm,
});

export const createCCMsgBeforeApplyContext = (
	params: CCAPIContext,
	ccu: CCUpdateParams,
): BeforeApplyCCMsgAPIContext => ({
	logger: params.logger,
	networkIdentifier: params.networkIdentifier,
	eventQueue: params.eventQueue,
	getAPIContext: params.getAPIContext,
	getStore: params.getStore,
	ccm: params.ccm,
	ccu,
});

export const createCCMsgBeforeSendContext = (
	params: CCAPIContext,
	feeAddress: Buffer,
): BeforeSendCCMsgAPIContext => ({
	logger: params.logger,
	networkIdentifier: params.networkIdentifier,
	eventQueue: params.eventQueue,
	getAPIContext: params.getAPIContext,
	getStore: params.getStore,
	ccm: params.ccm,
	feeAddress,
});
