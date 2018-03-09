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

import APIResource from 'api_client/api_resource';
import DelegatesResource from 'api_client/resources/delegates';

describe('DelegatesResource', () => {
	const defaultBasePath = 'http://localhost:1234';
	const path = '/delegates';

	let apiClient;
	let resource;

	beforeEach(() => {
		apiClient = {
			headers: {},
			currentNode: defaultBasePath,
			hasAvailableNodes: () => {},
			randomizeNodes: () => {},
			banActiveNodeAndSelect: () => {},
		};
		resource = new DelegatesResource(apiClient);
		return Promise.resolve();
	});

	describe('#constructor', () => {
		it('should throw error without apiClient input', () => {
			return (() => new DelegatesResource()).should.throw(
				'Require APIClient instance to be initialized.',
			);
		});

		it('should be instance of APIResource', () => {
			return resource.should.be.instanceOf(APIResource);
		});

		it('should have correct full path', () => {
			return resource.resourcePath.should.eql(`${defaultBasePath}/api${path}`);
		});

		it('should set resource path', () => {
			return resource.path.should.equal(path);
		});

		it('should have a "get" function', () => {
			return resource.should.have.property('get').which.is.a('function');
		});

		it('should have a "getStandby" function', () => {
			return resource.should.have.property('getStandby').which.is.a('function');
		});

		it('should have a "getForgers" function', () => {
			return resource.should.have.property('getForgers').which.is.a('function');
		});

		it('should have a "getForgingStats" function', () => {
			return resource.should.have
				.property('getForgingStats')
				.which.is.a('function');
		});
	});
});
