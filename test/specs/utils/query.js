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
import { setUpUtilQuery } from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('Query function', () => {
	beforeEach(setUpUtilQuery);
	Given('a Lisk API instance', given.aLiskAPIInstance, () => {
		Given('an endpoint "accounts"', given.anEndpoint, () => {
			Given('a parameters object', given.aParametersObject, () => {
				Given(
					'the parameters object has key set to key="address" value="new-address"',
					given.theParametersObjectHasKeySetTo,
					() => {
						When(
							'the query instance sends a request and the lisk api instance resolves with a successful array data response',
							when.theQueryInstanceSendsARequestAndTheLiskAPIInstanceResolvesWithASuccessfulArrayDataResponse,
							() => {
								Then(
									'it should resolve to an object',
									then.itShouldResolveToAnObject,
								);
								Then(
									'it should resolve to the first element of data of the response',
									then.itShouldResolveToTheFirstElementOfDataKeyOfTheResponse,
								);
								Then(
									'it should use the lisk api instance to send a request to the endpoint using the parameters',
									then.itShouldUseTheLiskAPIInstanceToSendARequestToTheEndpointUsingTheParameters,
								);
							},
						);
						Given(
							'an options object with key "testnet" set to boolean "true"',
							given.anOptionsObjectWithKeySetToBoolean,
							() => {
								When(
									'the query instance sends a request and the lisk api instance resolves with a successful array data response',
									when.theQueryInstanceSendsARequestAndTheLiskAPIInstanceResolvesWithASuccessfulArrayDataResponse,
									() => {
										Then(
											'it should resolve to an object',
											then.itShouldResolveToAnObject,
										);
										Then(
											'it should resolve to the first element of data of the response',
											then.itShouldResolveToTheFirstElementOfDataKeyOfTheResponse,
										);
										Then(
											'it should use the lisk api instance to send a request to the endpoint using the parameters',
											then.itShouldUseTheLiskAPIInstanceToSendARequestToTheEndpointUsingTheParameters,
										);
										Then(
											'the "getAPIClient" should be called with the testnet option',
											then.theGetAPIClientShouldBeCalledWithTestnetOption,
										);
									},
								);
								When(
									'the query instance sends a request and the lisk api instance resolves with a successful object data response',
									when.theQueryInstanceSendsARequestAndTheLiskAPIInstanceResolvesWithASuccessfulObjectDataResponse,
									() => {
										Then(
											'it should resolve to an object',
											then.itShouldResolveToAnObject,
										);
										Then(
											'it should resolve to the data of the response',
											then.itShouldResolveToTheDataKeyOfTheResponse,
										);
										Then(
											'it should use the lisk api instance to send a request to the endpoint using the parameters',
											then.itShouldUseTheLiskAPIInstanceToSendARequestToTheEndpointUsingTheParameters,
										);
										Then(
											'the "getAPIClient" should be called with the testnet option',
											then.theGetAPIClientShouldBeCalledWithTestnetOption,
										);
									},
								);
								When(
									'the query instance sends a request and the lisk api instance resolves with a failed response',
									when.theQueryInstanceSendsARequestAndTheLiskAPIInstanceResolvesWithAFailedResponse,
									() => {
										Then(
											'it should use the lisk api instance to send a request to the endpoint using the parameters',
											then.itShouldUseTheLiskAPIInstanceToSendARequestToTheEndpointUsingTheParameters,
										);
										Then(
											'it should reject with the error and message "Data was not found with specified parameters."',
											then.itShouldRejectWithErrorAndMessage,
										);
									},
								);
								When(
									'the query instance sends a request and the lisk api instance resolves with a successful response of empty array',
									when.theQueryInstanceSendsARequestAndTheLiskAPIInstanceResolvesWithASuccessfulResponseOfEmptyArray,
									() => {
										Then(
											'it should use the lisk api instance to send a request to the endpoint using the parameters',
											then.itShouldUseTheLiskAPIInstanceToSendARequestToTheEndpointUsingTheParameters,
										);
										Then(
											'it should reject with the error and message "Data was not found with specified parameters."',
											then.itShouldRejectWithErrorAndMessage,
										);
									},
								);
							},
						);
					},
				);
			});
		});
	});
});
