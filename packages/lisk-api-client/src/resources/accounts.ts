/*
 * Copyright © 2018 Lisk Foundation
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
import { GET } from '../constants';
import { ApiHandler } from '../types/types';

export class AccountsResource extends APIResource {
	public get: ApiHandler;
	public getMultisignatureGroups: ApiHandler;
	public getMultisignatureMemberships: ApiHandler;
	public path: string;

	public constructor(apiClient: APIClient) {
		super(apiClient);
		this.path = '/accounts';

		this.get = apiMethod({
			method: GET,
		}).bind(this);

		this.getMultisignatureGroups = apiMethod({
			method: GET,
			path: '/{address}/multisignature_groups',
			urlParams: ['address'],
		}).bind(this);

		this.getMultisignatureMemberships = apiMethod({
			method: GET,
			path: '/{address}/multisignature_memberships',
			urlParams: ['address'],
		}).bind(this);
	}
}
