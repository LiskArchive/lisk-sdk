/*
 * LiskHQ/lisky
 * Copyright © 2017 Lisk Foundation
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
import liskInstance from '../../src/utils/liskInstance';
import queryInstance from '../../src/utils/query';

export const givenThereIsAVorpalInstanceWithAnActiveCommandThatCanLog = () => {
	context.vorpal = {
		activeCommand: {
			log: sandbox.spy(),
		},
	};
};

export const givenThereIsAResultToPrint = () => {
	context.result = { lisk: 'JS' };
};

export const givenALiskInstance = () => {
	context.liskInstance = liskInstance;
};

export const givenAQueryInstance = () => {
	context.queryInstance = queryInstance;
	sandbox.stub(liskInstance, 'sendRequest');
};

export const givenABlockID = () => {
	context.blockID = '5650160629533476718';
};

export const givenAnAddress = () => {
	context.address = '13782017140058682841L';
};

export const givenATransactionID = () => {
	context.transactionId = '16388447461355055139';
};

export const givenADelegateUsername = () => {
	context.delegateUsername = 'lightcurve';
};
