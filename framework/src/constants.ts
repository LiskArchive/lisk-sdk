/*
 * Copyright © 2019 Lisk Foundation
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

export const INTERNAL_EVENTS = Object.freeze([
	'registeredToBus',
	'loading:started',
	'loading:finished',
	'unloading:started',
	'unloading:finished',
	'unloading:error',
]);

export const eventWithModuleNameReg = /^([^\d][\w]+)((?::[^\d][\w]+)+)$/;
export const moduleNameReg = /^[a-zA-Z][a-zA-Z0-9_]*$/;
export const actionWithModuleNameReg = /^[a-zA-Z][a-zA-Z0-9_]*:[a-zA-Z][a-zA-Z0-9]*$/;
export const APP_IDENTIFIER = 'app';

export const APP_EVENT_READY = 'app:ready';
export const APP_EVENT_SHUTDOWN = 'app:shutdown';
export const APP_EVENT_NETWORK_EVENT = 'app:network:event';
export const APP_EVENT_NETWORK_READY = 'app:network:ready';
export const APP_EVENT_TRANSACTION_NEW = 'app:transaction:new';
export const APP_EVENT_CHAIN_FORK = 'app:chain:fork';
export const APP_EVENT_CHAIN_VALIDATORS_CHANGE = 'app:chain:validators:change';
export const APP_EVENT_BLOCK_NEW = 'app:block:new';
export const APP_EVENT_BLOCK_DELETE = 'app:block:delete';

export const EVENT_POST_BLOCK = 'postBlock';
export const EVENT_POST_TRANSACTION_ANNOUNCEMENT = 'postTransactionsAnnouncement';
export const EVENT_POST_NODE_INFO = 'postNodeInfo';
