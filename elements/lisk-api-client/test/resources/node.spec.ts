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
import { APIClient } from '../../src/api_client';
import { APIResource } from '../../src/api_resource';
import { NodeResource } from '../../src/resources/node';

describe('NodeResource', () => {
	const defaultBasePath = 'http://localhost:1234';
	const path = '/node';

	let apiClient: APIClient;
	let resource: APIResource;

	beforeEach(async () => {
		apiClient = new APIClient([defaultBasePath]);
		resource = new NodeResource(apiClient);
		return Promise.resolve();
	});

	describe('#constructor', () => {
		it('should be instance of APIResource', () => {
			return expect(resource).toBeInstanceOf(APIResource);
		});

		it('should have correct full path', () => {
			return expect(resource.resourcePath).toEqual(
				`${defaultBasePath}/api${path}`,
			);
		});

		it('should set resource path', () => {
			return expect(resource.path).toBe(path);
		});

		it('should have a "getConstants" function', () => {
			return expect((resource as any).getConstants).toBeFunction();
		});

		it('should have a "getStatus" function', () => {
			return expect((resource as any).getStatus).toBeFunction();
		});

		it('should have a "getForgingStatus" function', () => {
			return expect((resource as any).getForgingStatus).toBeFunction();
		});

		it('should have a "updateForgingStatus" function', () => {
			return expect((resource as any).updateForgingStatus).toBeFunction();
		});

		it('should have a "getTransactions" function', () => {
			return expect((resource as any).getTransactions).toBeFunction();
		});
	});
});
