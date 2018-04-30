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

import { GET } from '../constants';
import APIResource from '../api_resource';
import apiMethod from '../api_method';

export default class AccountsResource extends APIResource {
	constructor(apiClient) {
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
