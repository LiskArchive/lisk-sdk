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
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('API util', () => {
	Given(
		'a config with "api.network" set to "main"',
		given.aConfigWithAPINetworkSetTo,
		() => {
			Given(
				'a config with "api.nodes" set to "http://localhost:4000"',
				given.aConfigWithAPINodesSetTo,
				() => {
					When(
						'a API Client instance is created',
						when.aLiskAPIInstanceIsCreated,
						() => {
							Then(
								'the lisk instance should be a lisk-js API instance',
								then.theLiskAPIInstanceShouldBeALiskJSAPIInstance,
							);
							Then(
								'the lisk instance should have nethash equal to "ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511"',
								then.theLiskAPIInstanceShouldHaveNethashEqualTo,
							);
							Then(
								'the lisk instance should have nethash equal to "http://localhost:4000"',
								then.theLiskAPIInstanceShouldHaveCurrentNodeEqualTo,
							);
						},
					);
				},
			);
		},
	);
	Given(
		'a config with "api.network" set to "test"',
		given.aConfigWithAPINetworkSetTo,
		() => {
			Given(
				'a config with "api.nodes" set to "http://localhost:4000"',
				given.aConfigWithAPINodesSetTo,
				() => {
					When(
						'a API Client instance is created',
						when.aLiskAPIInstanceIsCreated,
						() => {
							Then(
								'the lisk instance should be a lisk-js API instance',
								then.theLiskAPIInstanceShouldBeALiskJSAPIInstance,
							);
							Then(
								'the lisk instance should have nethash equal to "da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba"',
								then.theLiskAPIInstanceShouldHaveNethashEqualTo,
							);
							Then(
								'the lisk instance should have nethash equal to "http://localhost:4000"',
								then.theLiskAPIInstanceShouldHaveCurrentNodeEqualTo,
							);
						},
					);
				},
			);
			Given(
				'a config with "api.nodes" set to ""',
				given.aConfigWithAPINodesSetTo,
				() => {
					When(
						'a API Client instance is created',
						when.aLiskAPIInstanceIsCreated,
						() => {
							Then(
								'the lisk instance should be a lisk-js API instance',
								then.theLiskAPIInstanceShouldBeALiskJSAPIInstance,
							);
							Then(
								'the lisk instance should have nethash equal to "da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba"',
								then.theLiskAPIInstanceShouldHaveNethashEqualTo,
							);
							Then(
								'the lisk instance should have nethash equal to "http://testnet.lisk.io:7000"',
								then.theLiskAPIInstanceShouldHaveCurrentNodeEqualTo,
							);
						},
					);
				},
			);
		},
	);
	Given(
		'a config with "api.network" set to "ef3844327d1fd0fc5aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa2b7e859e9ca0c"',
		given.aConfigWithAPINetworkSetTo,
		() => {
			Given(
				'a config with "api.nodes" set to "http://localhost:4000"',
				given.aConfigWithAPINodesSetTo,
				() => {
					When(
						'a API Client instance is created',
						when.aLiskAPIInstanceIsCreated,
						() => {
							Then(
								'the lisk instance should be a lisk-js API instance',
								then.theLiskAPIInstanceShouldBeALiskJSAPIInstance,
							);
							Then(
								'the lisk instance should have nethash equal to "ef3844327d1fd0fc5aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa2b7e859e9ca0c"',
								then.theLiskAPIInstanceShouldHaveNethashEqualTo,
							);
							Then(
								'the lisk instance should have nethash equal to "http://localhost:4000"',
								then.theLiskAPIInstanceShouldHaveCurrentNodeEqualTo,
							);
						},
					);
				},
			);
		},
	);
});
