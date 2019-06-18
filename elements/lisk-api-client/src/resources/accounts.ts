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
import { APIHandler } from '../api_types';
import { GET } from '../constants';

export class AccountsResource extends APIResource {
	public get: APIHandler;
	public getMultisignatureGroups: APIHandler;
	public getMultisignatureMemberships: APIHandler;
	public path: string;

	public constructor(apiClient: APIClient) {
		super(apiClient);
		this.path = '/accounts';

		/**
		 * Searches for matching accounts in the system.
		 *
		 * ```ts
		 * client.accounts.get({ username: 'oliver' }
		 *   .then(res => {
		 *     console.log(res.data);
		 * });
		 * ```
		 */
		this.get = apiMethod({
			method: GET,
		}).bind(this);

		/**
		 * Searches for the specified account in the system and responds with a list of the multisignature groups that this account is a member of.
		 *
		 * ```ts
		 * client.accounts.getMultisignatureGroups('15434119221255134066L')
		 *   .then(res => {
		 *     console.log(res.data);
		 * });
		 * ```
		 */
		this.getMultisignatureGroups = apiMethod({
			method: GET,
			path: '/{address}/multisignature_groups',
			urlParams: ['address'],
		}).bind(this);

		/**
		 * Searches for the specified multisignature group and responds with a list of all members of this particular multisignature group.
		 *
		 * ```ts
		 * client.accounts.getMultisignatureMemberships('15434119221255134066L')
		 *   .then(res => {
		 *     console.log(res.data);
		 * });
		 * ```
		 */
		this.getMultisignatureMemberships = apiMethod({
			method: GET,
			path: '/{address}/multisignature_memberships',
			urlParams: ['address'],
		}).bind(this);
	}
}
