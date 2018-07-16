/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
import getAPIClient from '../../../src/utils/api';

export function aLiskAPIInstance() {
	this.test.ctx.liskAPIInstance = getAPIClient();
}

export function getForgingStatusRejectsWithError() {
	const { liskAPIInstance } = this.test.ctx;
	const errorMessage = 'some error';
	liskAPIInstance.node.getForgingStatus.rejects(new Error(errorMessage));
	this.test.ctx.errorMessage = errorMessage;
}

export function getNodeStatusResolvesSuccessfully() {
	const { liskAPIInstance } = this.test.ctx;
	const data = {
		status: 'node',
	};
	liskAPIInstance.node.getStatus.resolves({ data });

	this.test.ctx.nodeStatus = data;
}

export function getNodeStatusRejectsWithError() {
	const { liskAPIInstance } = this.test.ctx;
	const errorMessage = 'some error';
	liskAPIInstance.node.getStatus.rejects(new Error(errorMessage));
	this.test.ctx.errorMessage = errorMessage;
}

export function getNodeConstantsRejectsWithError() {
	const { liskAPIInstance } = this.test.ctx;
	const errorMessage = 'some error';
	liskAPIInstance.node.getConstants.rejects(new Error(errorMessage));
	this.test.ctx.errorMessage = errorMessage;
}

export function getNodeConstantsResolvesSuccessfully() {
	const { liskAPIInstance } = this.test.ctx;
	const data = {
		constants: 'some constants',
	};
	liskAPIInstance.node.getConstants.resolves({ data });

	this.test.ctx.nodeConstants = data;
}

export function updateForgingStatusResolvesSuccessfully() {
	const { liskAPIInstance, publicKey } = this.test.ctx;
	const response = {
		data: [
			{
				publicKey,
				forging: true,
			},
		],
	};
	this.test.ctx.apiResponse = response.data;
	liskAPIInstance.node.updateForgingStatus.resolves(response);
}

export function updateForgingStatusRejectsWithError() {
	const { liskAPIInstance } = this.test.ctx;
	const errorMessage = 'some error';
	this.test.ctx.errorMessage = errorMessage;
	liskAPIInstance.node.updateForgingStatus.rejects(new Error(errorMessage));
}
