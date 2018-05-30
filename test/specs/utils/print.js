/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
import { setUpUtilPrint } from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('print util', () => {
	beforeEach(setUpUtilPrint);
	describe('print', () => {
		Given(
			'a Vorpal instance that can log',
			given.aVorpalInstanceThatCanLog,
			() => {
				Given('there is a result to print', given.thereIsAResultToPrint, () => {
					Given(
						'a config with json set to true',
						given.aConfigWithJsonSetTo,
						() => {
							Given(
								'an active command that can log',
								given.anActiveCommandThatCanLog,
								() => {
									When(
										'the result is printed using the active command context',
										when.theResultIsPrintedUsingTheActiveCommandContext,
										() => {
											Then(
												'the active command should be used to log',
												then.theActiveCommandShouldBeUsedToLog,
											);
										},
									);
								},
							);
							When('the result is printed', when.theResultIsPrinted, () => {
								Then(
									'shouldUseJSONOutput should be called with the config and an empty options object',
									then.shouldUseJSONOutputShouldBeCalledWithTheConfigAndAnEmptyOptionsObject,
								);
								Then(
									'shouldUsePrettyOutput should be called with the config and an empty options object',
									then.shouldUsePrettyOutputShouldBeCalledWithTheConfigAndAnEmptyOptionsObject,
								);
							});
							Given(
								'an options object with json set to false',
								given.anOptionsObjectWithJsonSetTo,
								() => {
									Given(
										'JSON should not be printed',
										given.jsonShouldNotBePrinted,
										() => {
											When(
												'the result is printed',
												when.theResultIsPrinted,
												() => {
													Then(
														'shouldUseJSONOutput should be called with the config and the options',
														then.shouldUseJSONOutputShouldBeCalledWithTheConfigAndTheOptions,
													);
													Then(
														'a table should be logged',
														then.aTableShouldBeLogged,
													);
												},
											);
										},
									);
									Given(
										'JSON should be printed',
										given.jsonShouldBePrinted,
										() => {
											Given(
												'output should not be pretty',
												given.outputShouldNotBePretty,
												() => {
													When(
														'the result is printed',
														when.theResultIsPrinted,
														() => {
															Then(
																'shouldUseJSONOutput should be called with the config and the options',
																then.shouldUseJSONOutputShouldBeCalledWithTheConfigAndTheOptions,
															);
															Then(
																'shouldUsePrettyOutput should be called with the config and the options',
																then.shouldUsePrettyOutputShouldBeCalledWithTheConfigAndTheOptions,
															);
															Then(
																'JSON output should be logged without ANSI codes',
																then.jsonOutputShouldBeLoggedWithoutANSICodes,
															);
														},
													);
												},
											);
											Given(
												'the options object has key "pretty" set to boolean true',
												given.theOptionsObjectHasKeySetToBoolean,
												() => {
													Given(
														'output should be pretty',
														given.outputShouldBePretty,
														() => {
															When(
																'the result is printed',
																when.theResultIsPrinted,
																() => {
																	Then(
																		'shouldUseJSONOutput should be called with the config and the options',
																		then.shouldUseJSONOutputShouldBeCalledWithTheConfigAndTheOptions,
																	);
																	Then(
																		'shouldUsePrettyOutput should be called with the config and the options',
																		then.shouldUsePrettyOutputShouldBeCalledWithTheConfigAndTheOptions,
																	);
																	Then(
																		'pretty JSON output should be logged without ANSI codes',
																		then.prettyJSONOutputShouldBeLoggedWithoutANSICodes,
																	);
																},
															);
														},
													);
												},
											);
										},
									);
								},
							);
						},
					);
					Given(
						'a config with json set to true and pretty set to true',
						given.aConfigWithJsonSetToAndPrettySetTo,
						() => {
							Given(
								'an empty options object',
								given.anEmptyOptionsObject,
								() => {
									Given(
										'JSON should be printed',
										given.jsonShouldBePrinted,
										() => {
											Given(
												'output should be pretty',
												given.outputShouldBePretty,
												() => {
													When(
														'the result is printed',
														when.theResultIsPrinted,
														() => {
															Then(
																'shouldUseJSONOutput should be called with the config and the options',
																then.shouldUseJSONOutputShouldBeCalledWithTheConfigAndTheOptions,
															);
															Then(
																'shouldUsePrettyOutput should be called with the config and the options',
																then.shouldUsePrettyOutputShouldBeCalledWithTheConfigAndTheOptions,
															);
															Then(
																'pretty JSON output should be logged without ANSI codes',
																then.prettyJSONOutputShouldBeLoggedWithoutANSICodes,
															);
														},
													);
												},
											);
										},
									);
								},
							);
							Given(
								'an options object with key "pretty" set to boolean false',
								given.anOptionsObjectWithKeySetToBoolean,
								() => {
									Given(
										'JSON should be printed',
										given.jsonShouldBePrinted,
										() => {
											Given(
												'output should not be pretty',
												given.outputShouldNotBePretty,
												() => {
													When(
														'the result is printed',
														when.theResultIsPrinted,
														() => {
															Then(
																'shouldUseJSONOutput should be called with the config and the options',
																then.shouldUseJSONOutputShouldBeCalledWithTheConfigAndTheOptions,
															);
															Then(
																'shouldUsePrettyOutput should be called with the config and the options',
																then.shouldUsePrettyOutputShouldBeCalledWithTheConfigAndTheOptions,
															);
															Then(
																'JSON output should be logged without ANSI codes',
																then.jsonOutputShouldBeLoggedWithoutANSICodes,
															);
														},
													);
												},
											);
										},
									);
								},
							);
						},
					);
				});
				Given(
					'there are results to print',
					given.thereAreResultsToPrint,
					() => {
						Given(
							'a config with json set to true',
							given.aConfigWithJsonSetTo,
							() => {
								Given(
									'an options object with json set to false',
									given.anOptionsObjectWithJsonSetTo,
									() => {
										Given(
											'JSON should be printed',
											given.jsonShouldBePrinted,
											() => {
												Given(
													'output should not be pretty',
													given.outputShouldNotBePretty,
													() => {
														When(
															'the results are printed',
															when.theResultsArePrinted,
															() => {
																Then(
																	'shouldUseJSONOutput should be called with the config and the options',
																	then.shouldUseJSONOutputShouldBeCalledWithTheConfigAndTheOptions,
																);
																Then(
																	'shouldUsePrettyOutput should be called with the config and the options',
																	then.shouldUsePrettyOutputShouldBeCalledWithTheConfigAndTheOptions,
																);
																Then(
																	'JSON outputs should be logged without ANSI codes',
																	then.jsonOutputsShouldBeLoggedWithoutANSICodes,
																);
															},
														);
													},
												);
												Given(
													'the options object has key "pretty" set to boolean true',
													given.theOptionsObjectHasKeySetToBoolean,
													() => {
														Given(
															'output should be pretty',
															given.outputShouldBePretty,
															() => {
																When(
																	'the results are printed',
																	when.theResultsArePrinted,
																	() => {
																		Then(
																			'shouldUseJSONOutput should be called with the config and the options',
																			then.shouldUseJSONOutputShouldBeCalledWithTheConfigAndTheOptions,
																		);
																		Then(
																			'shouldUsePrettyOutput should be called with the config and the options',
																			then.shouldUsePrettyOutputShouldBeCalledWithTheConfigAndTheOptions,
																		);
																		Then(
																			'pretty JSON outputs should be logged without ANSI codes',
																			then.prettyJSONOutputsShouldBeLoggedWithoutANSICodes,
																		);
																	},
																);
															},
														);
													},
												);
											},
										);
									},
								);
							},
						);
						Given(
							'a config with json set to true and pretty set to true',
							given.aConfigWithJsonSetToAndPrettySetTo,
							() => {
								Given(
									'an empty options object',
									given.anEmptyOptionsObject,
									() => {
										Given(
											'JSON should be printed',
											given.jsonShouldBePrinted,
											() => {
												Given(
													'output should be pretty',
													given.outputShouldBePretty,
													() => {
														When(
															'the results are printed',
															when.theResultsArePrinted,
															() => {
																Then(
																	'shouldUseJSONOutput should be called with the config and the options',
																	then.shouldUseJSONOutputShouldBeCalledWithTheConfigAndTheOptions,
																);
																Then(
																	'shouldUsePrettyOutput should be called with the config and the options',
																	then.shouldUsePrettyOutputShouldBeCalledWithTheConfigAndTheOptions,
																);
																Then(
																	'pretty JSON outputs should be logged without ANSI codes',
																	then.prettyJSONOutputsShouldBeLoggedWithoutANSICodes,
																);
															},
														);
													},
												);
											},
										);
									},
								);
								Given(
									'an options object with key "pretty" set to boolean false',
									given.anOptionsObjectWithKeySetToBoolean,
									() => {
										Given(
											'JSON should be printed',
											given.jsonShouldBePrinted,
											() => {
												Given(
													'output should not be pretty',
													given.outputShouldNotBePretty,
													() => {
														When(
															'the results are printed',
															when.theResultsArePrinted,
															() => {
																Then(
																	'shouldUseJSONOutput should be called with the config and the options',
																	then.shouldUseJSONOutputShouldBeCalledWithTheConfigAndTheOptions,
																);
																Then(
																	'shouldUsePrettyOutput should be called with the config and the options',
																	then.shouldUsePrettyOutputShouldBeCalledWithTheConfigAndTheOptions,
																);
																Then(
																	'JSON outputs should be logged without ANSI codes',
																	then.jsonOutputsShouldBeLoggedWithoutANSICodes,
																);
															},
														);
													},
												);
											},
										);
									},
								);
							},
						);
					},
				);
			},
		);
	});
});
