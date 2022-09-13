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
	BeforeApplyCCMsgMethodContext,
	BeforeSendCCMsgMethodContext,
	CCMethodContext,
	CCCommandExecuteContext,
	CCUpdateParams,
} from './types';

export const createCCCommandExecuteContext = (
	params: CCMethodContext & { ccm: CCMsg; ccmSize: bigint },
): CCCommandExecuteContext => ({
	logger: params.logger,
	chainID: params.chainID,
	eventQueue: params.eventQueue,
	getMethodContext: params.getMethodContext,
	getStore: params.getStore,
	ccm: params.ccm,
	feeAddress: params.feeAddress,
	ccmSize: params.ccmSize,
});

export const createCCMsgBeforeApplyContext = (
	params: CCMethodContext,
	ccu: CCUpdateParams,
	trsSender: Buffer,
): BeforeApplyCCMsgMethodContext => ({
	logger: params.logger,
	chainID: params.chainID,
	eventQueue: params.eventQueue,
	getMethodContext: params.getMethodContext,
	getStore: params.getStore,
	ccm: params.ccm,
	ccu,
	feeAddress: params.feeAddress,
	trsSender,
});

export const createCCMsgBeforeSendContext = (
	params: CCMethodContext,
): BeforeSendCCMsgMethodContext => ({
	logger: params.logger,
	chainID: params.chainID,
	eventQueue: params.eventQueue,
	getMethodContext: params.getMethodContext,
	getStore: params.getStore,
	feeAddress: params.feeAddress,
	ccm: params.ccm,
});
