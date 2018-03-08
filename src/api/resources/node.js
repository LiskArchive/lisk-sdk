/*
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

import { GET, PUT } from 'constants';
import apiMethod from '../apiMethod';
import APIResource from '../apiResource';

export default class NodeResource extends APIResource {
	constructor(liskAPI) {
		super(liskAPI);
		this.path = '/node';

		this.getConstants = apiMethod({
			method: GET,
			path: '/constants',
		}).bind(this);

		this.getStatus = apiMethod({
			method: GET,
			path: '/status',
		}).bind(this);

		this.getForgingStatus = apiMethod({
			method: GET,
			path: '/status/forging',
		}).bind(this);

		this.updateForgingStatus = apiMethod({
			method: PUT,
			path: '/status/forging',
		}).bind(this);

		this.getTransactions = apiMethod({
			method: GET,
			path: '/transactions/{state}',
			urlParams: ['state'],
		}).bind(this);
	}
}
