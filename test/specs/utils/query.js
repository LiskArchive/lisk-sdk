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

describe('Query class', () => {
	Given('a Lisk API instance', given.aLiskAPIInstance, () => {
		Given('a query instance', given.aQueryInstance, () => {
			Then(
				'the query instance should have the Lisk API instance as a client',
				then.theQueryInstanceShouldHaveTheLiskAPIInstanceAsAClient,
			);
			Then(
				'the query instance should have a handler for "account"',
				then.theQueryInstanceShouldHaveAHandlerFor,
			);
			Then(
				'the query instance should have a handler for "block"',
				then.theQueryInstanceShouldHaveAHandlerFor,
			);
			Then(
				'the query instance should have a handler for "delegate"',
				then.theQueryInstanceShouldHaveAHandlerFor,
			);
			Then(
				'the query instance should have a handler for "transaction"',
				then.theQueryInstanceShouldHaveAHandlerFor,
			);
			describe('#sendRequest', () => {
				Given('an endpoint "delegates/get"', given.anEndpoint, () => {
					Given('a parameters object', given.aParametersObject, () => {
						Given(
							'the parameters object has key "username" set to "lightcurve"',
							given.theParametersObjectHasKeySetTo,
							() => {
								When(
									'the query instance sends a request using the endpoint and the parameters',
									when.theQueryInstanceSendsARequestUsingTheEndpointAndTheParameters,
									() => {
										Then(
											'it should not set the Lisk API instance testnet setting',
											then.itShouldNotSetTheLiskAPIInstanceTestnetSetting,
										);
										Then(
											'it should use the Lisk API instance to send a request to the endpoint using the parameters',
											then.itShouldUseTheLiskAPIInstanceToSendARequestToTheEndpointUsingTheParameters,
										);
										Then(
											'it should resolve to the result of sending the request',
											then.itShouldResolveToTheResultOfSendingTheRequest,
										);
									},
								);
								When(
									'a rejection occurs sending a request using the endpoint and the parameters',
									when.aRejectionOccursSendingARequestUsingTheEndpointAndTheParameters,
									() => {
										Then(
											'it should not set the Lisk API instance testnet setting',
											then.itShouldNotSetTheLiskAPIInstanceTestnetSetting,
										);
										Then(
											'it should use the Lisk API instance to send a request to the endpoint using the parameters',
											then.itShouldUseTheLiskAPIInstanceToSendARequestToTheEndpointUsingTheParameters,
										);
										Then(
											'it should reject with the the original rejection',
											then.itShouldRejectWithTheOriginalRejection,
										);
									},
								);
								Given('an options object', given.anOptionsObject, () => {
									Given(
										'the options object has key "testnet" set to boolean true',
										given.theOptionsObjectHasKeySetToBoolean,
										() => {
											When(
												'the query instance sends a request using the endpoint, the parameters and the options',
												when.theQueryInstanceSendsARequestUsingTheEndpointTheParametersAndTheOptions,
												() => {
													Then(
														'it should set the Lisk API instance testnet setting to true',
														then.itShouldSetTheLiskAPIInstanceTestnetSettingTo,
													);
													Then(
														'it should use the Lisk API instance to send a request to the endpoint using the parameters',
														then.itShouldUseTheLiskAPIInstanceToSendARequestToTheEndpointUsingTheParameters,
													);
													Then(
														'it should set the Lisk API instance testnet setting back to the original setting',
														then.itShouldSetTheLiskAPIInstanceTestnetSettingBackToTheOriginalSetting,
													);
													Then(
														'it should resolve to the result of sending the request',
														then.itShouldResolveToTheResultOfSendingTheRequest,
													);
												},
											);
											When(
												'a rejection occurs sending a request using the endpoint, the parameters and the options',
												when.aRejectionOccursSendingARequestUsingTheEndpointTheParametersAndTheOptions,
												() => {
													Then(
														'it should set the Lisk API instance testnet setting to true',
														then.itShouldSetTheLiskAPIInstanceTestnetSettingTo,
													);
													Then(
														'it should use the Lisk API instance to send a request to the endpoint using the parameters',
														then.itShouldUseTheLiskAPIInstanceToSendARequestToTheEndpointUsingTheParameters,
													);
													Then(
														'it should set the Lisk API instance testnet setting back to the original setting',
														then.itShouldSetTheLiskAPIInstanceTestnetSettingBackToTheOriginalSetting,
													);
													Then(
														'it should reject with the the original rejection',
														then.itShouldRejectWithTheOriginalRejection,
													);
												},
											);
										},
									);
								});
							},
						);
					});
				});
			});
			describe('#getBlock', () => {
				Given('a block ID "5650160629533476718"', given.aBlockID, () => {
					When(
						'the query instance gets a block using the ID',
						when.theQueryInstanceGetsABlockUsingTheID,
						() => {
							Then(
								'the lisk instance should send a request to the blocks/get API endpoint with the block ID',
								then.theLiskAPIInstanceShouldSendARequestToTheBlocksGetAPIEndpointWithTheBlockID,
							);
						},
					);
				});
			});
			describe('#getAccount', () => {
				Given('an address "13782017140058682841L"', given.anAddress, () => {
					When(
						'the query instance gets an account using the address',
						when.theQueryInstanceGetsAnAccountUsingTheAddress,
						() => {
							Then(
								'the lisk instance should send a request to the accounts API endpoint with the address',
								then.theLiskAPIInstanceShouldSendARequestToTheAccountsAPIEndpointWithTheAddress,
							);
						},
					);
				});
			});
			describe('#getTransaction', () => {
				Given(
					'a transaction ID "16388447461355055139"',
					given.aTransactionID,
					() => {
						When(
							'the query instance gets a transaction using the ID',
							when.theQueryInstanceGetsATransactionUsingTheID,
							() => {
								Then(
									'the lisk instance should send a request to the transactions/get API endpoint with the transaction ID',
									then.theLiskAPIInstanceShouldSendARequestToTheTransactionsGetAPIEndpointWithTheTransactionID,
								);
							},
						);
					},
				);
			});
			describe('#getDelegate', () => {
				Given(
					'a delegate username "lightcurve"',
					given.aDelegateUsername,
					() => {
						When(
							'the query instance gets a delegate using the username',
							when.theQueryInstanceGetsADelegateUsingTheUsername,
							() => {
								Then(
									'the lisk instance should send a request to the delegates/get API endpoint with the username',
									then.theLiskAPIInstanceShouldSendARequestToTheDelegatesGetAPIEndpointWithTheUsername,
								);
							},
						);
					},
				);
			});
		});
	});
});
