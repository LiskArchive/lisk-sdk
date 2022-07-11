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
	CCMsg,
	BeforeApplyCCMsgAPIContext,
	BeforeSendCCMsgAPIContext,
	CCAPIContext,
	CCCommandExecuteContext,
	CCUpdateParams,
} from './types';

export const createCCCommandExecuteContext = (
	params: CCAPIContext & { ccm: CCMsg },
): CCCommandExecuteContext => ({
	logger: params.logger,
	networkIdentifier: params.networkIdentifier,
	eventQueue: params.eventQueue,
	getAPIContext: params.getAPIContext,
	getStore: params.getStore,
	ccm: params.ccm,
	feeAddress: params.feeAddress,
});

export const createCCMsgBeforeApplyContext = (
	params: CCAPIContext,
	ccu: CCUpdateParams,
	trsSender: Buffer,
): BeforeApplyCCMsgAPIContext => ({
	logger: params.logger,
	networkIdentifier: params.networkIdentifier,
	eventQueue: params.eventQueue,
	getAPIContext: params.getAPIContext,
	getStore: params.getStore,
	ccm: params.ccm,
	ccu,
	feeAddress: params.feeAddress,
	trsSender,
});

export const createCCMsgBeforeSendContext = (params: CCAPIContext): BeforeSendCCMsgAPIContext => ({
	logger: params.logger,
	networkIdentifier: params.networkIdentifier,
	eventQueue: params.eventQueue,
	getAPIContext: params.getAPIContext,
	getStore: params.getStore,
	feeAddress: params.feeAddress,
	ccm: params.ccm,
});
