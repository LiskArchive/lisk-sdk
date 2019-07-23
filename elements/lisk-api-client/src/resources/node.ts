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
 *
 */
import { APIClient } from '../api_client';
import { apiMethod } from '../api_method';
import { APIResource } from '../api_resource';
import { APIHandler } from '../api_types';
import { GET, PUT } from '../constants';

export class NodeResource extends APIResource {
	public getConstants: APIHandler;
	public getForgingStatus: APIHandler;
	public getStatus: APIHandler;
	public getTransactions: APIHandler;
	public path: string;
	public updateForgingStatus: APIHandler;

	public constructor(apiClient: APIClient) {
		super(apiClient);
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
