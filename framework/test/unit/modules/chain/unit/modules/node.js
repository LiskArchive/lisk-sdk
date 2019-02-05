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
 */

'use strict';

const genesisDelegates = require('../../../../../data/genesis_delegates.json');
const accountFixtures = require('.../../../../../../../fixtures/accounts');
const application = require('../../../../../common/application');
const BlockReward = require('../../../../../../src/modules/chain/logic/block_reward');
const Node = require('../../../../../../src/modules/chain/modules/node');

const { EPOCH_TIME, FEES } = global.constants;

describe('node', async () => {
	const testDelegate = genesisDelegates.delegates[0];
	let defaultPassword;
	let library;
	const stubs = {};

	before(done => {
		application.init(
			{ sandbox: { name: 'lisk_test_modules_node' } },
			(err, scope) => {
				library = scope;
				// Set delegates module as loaded to allow manual forging
				library.rewiredModules.delegates.__set__('__private.loaded', true);
				// Load forging delegates
				library.rewiredModules.delegates.__get__('__private');
				done(err);
			}
		);
	});

	after(done => {
		application.cleanup(done);
	});

	describe('constructor', async () => {
		let rewiredNodeModule;

		before(done => {
			rewiredNodeModule = library.rewiredModules.node;
			done();
		});

		describe('library', async () => {
			let privateLibrary;

			before(done => {
				privateLibrary = rewiredNodeModule.__get__('library');
				done();
			});

			it('should assign build', done => {
				expect(privateLibrary).to.have.property('build', library.build);
				done();
			});

			it('should assign lastCommit', done => {
				expect(privateLibrary).to.have.property(
					'lastCommit',
					library.lastCommit
				);
				done();
			});

			it('should assign config.version', done => {
				expect(privateLibrary).to.have.nested.property(
					'config.version',
					library.config.version
				);
				done();
			});

			it('should assign config.nethash', done => {
				expect(privateLibrary).to.have.nested.property(
					'config.nethash',
					library.config.nethash
				);
				done();
			});

			it('should assign config.nonce', done => {
				expect(privateLibrary).to.have.nested.property(
					'config.nonce',
					library.config.nonce
				);
				done();
			});
		});

		it('should assign blockReward', done => {
			const blockReward = rewiredNodeModule.__get__('blockReward');
			expect(blockReward).to.not.be.undefined;
			done();
		});

		it('should assign blockReward with BlockReward instance', done => {
			const blockReward = rewiredNodeModule.__get__('blockReward');
			expect(blockReward).to.be.an.instanceof(BlockReward);
			done();
		});

		it('should call callback with error = null', done => {
			// eslint-disable-next-line no-unused-vars
			new Node((error, instance) => {
				expect(error).to.be.null;
				done();
			}, library);
		});

		it('should call callback with result as a Node instance', done => {
			new Node((error, instance) => {
				expect(instance).to.be.an.instanceof(Node);
				done();
			}, library);
		});
	});

	describe('internal', async () => {
		let node_module;

		before(done => {
			node_module = library.modules.node;
			done();
		});

		function updateForgingStatus(testDelegateArg, forging, cb) {
			node_module.internal.getForgingStatus(
				testDelegateArg.publicKey,
				(err, res) => {
					if (res.length) {
						return node_module.internal.updateForgingStatus(
							testDelegateArg.publicKey,
							testDelegateArg.password,
							forging,
							cb
						);
					}
					return cb(err, {
						publicKey: testDelegateArg.publicKey,
						password: testDelegateArg.password,
					});
				}
			);
		}

		describe('updateForgingStatus', async () => {
			before(done => {
				defaultPassword = library.config.forging.defaultPassword;
				done();
			});

			it('should return error with invalid password', done => {
				node_module.internal.updateForgingStatus(
					testDelegate.publicKey,
					'Invalid password',
					true,
					err => {
						expect(err).to.equal('Invalid password and public key combination');
						done();
					}
				);
			});

			it('should return error with invalid publicKey', done => {
				const invalidPublicKey =
					'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9fff0a';

				node_module.internal.updateForgingStatus(
					invalidPublicKey,
					defaultPassword,
					true,
					err => {
						expect(err).equal(
							'Delegate with publicKey: 9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9fff0a not found'
						);
						done();
					}
				);
			});

			it('should return error with non delegate account', done => {
				node_module.internal.updateForgingStatus(
					accountFixtures.genesis.publicKey,
					accountFixtures.genesis.password,
					true,
					err => {
						expect(err).equal(
							'Delegate with publicKey: c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f not found'
						);
						done();
					}
				);
			});

			it('should update forging from enabled to disabled', done => {
				updateForgingStatus(testDelegate, true, err => {
					expect(err).to.not.exist;

					node_module.internal.updateForgingStatus(
						testDelegate.publicKey,
						defaultPassword,
						false,
						(updateForgingStatusErr, res) => {
							expect(updateForgingStatusErr).to.not.exist;
							expect(res).to.eql({
								publicKey: testDelegate.publicKey,
								forging: false,
							});
							done();
						}
					);
				});
			});

			it('should update forging from disabled to enabled', done => {
				updateForgingStatus(testDelegate, false, err => {
					expect(err).to.not.exist;

					node_module.internal.updateForgingStatus(
						testDelegate.publicKey,
						defaultPassword,
						true,
						(updateForgingStatusErr, res) => {
							expect(updateForgingStatusErr).to.not.exist;
							expect(res).to.eql({
								publicKey: testDelegate.publicKey,
								forging: true,
							});
							done();
						}
					);
				});
			});
		});

		describe('getForgingStatus', async () => {
			it('should return delegate full list when publicKey is not provided', done => {
				node_module.internal.getForgingStatus(null, (err, data) => {
					expect(err).to.be.null;
					expect(data[0]).to.deep.equal({
						forging: true,
						publicKey: testDelegate.publicKey,
					});
					expect(data.length).to.equal(genesisDelegates.delegates.length);
					done();
				});
			});

			it('should return delegate status when publicKey is provided', done => {
				node_module.internal.getForgingStatus(
					testDelegate.publicKey,
					(err, data) => {
						expect(err).to.be.null;
						expect(data[0]).to.deep.equal({
							forging: true,
							publicKey: testDelegate.publicKey,
						});
						expect(data.length).to.equal(1);
						done();
					}
				);
			});

			it('should return delegate status when publicKey is provided and updated forging from enabled to disabled', done => {
				node_module.internal.updateForgingStatus(
					testDelegate.publicKey,
					defaultPassword,
					false,
					(err, res) => {
						expect(err).to.not.exist;
						expect(res).to.eql({
							publicKey: testDelegate.publicKey,
							forging: false,
						});
						node_module.internal.getForgingStatus(
							testDelegate.publicKey,
							(getForgingStatusErr, data) => {
								expect(getForgingStatusErr).to.be.null;
								expect(data[0]).to.deep.equal({
									forging: false,
									publicKey: testDelegate.publicKey,
								});
								expect(data.length).to.equal(1);
								done();
							}
						);
					}
				);
			});

			it('should return updated delegate full list when publicKey is not provided and forging status was changed', done => {
				node_module.internal.getForgingStatus(null, (err, data) => {
					expect(err).to.be.null;
					expect(data[0]).to.deep.equal({
						forging: false,
						publicKey: testDelegate.publicKey,
					});
					expect(data.length).to.equal(genesisDelegates.delegates.length);
					done();
				});
			});

			it('should return empty array when invalid publicKey is provided', done => {
				const invalidPublicKey =
					'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9fff0a';
				node_module.internal.getForgingStatus(invalidPublicKey, (err, data) => {
					expect(err).to.be.null;
					expect(data.length).to.equal(0);
					done();
				});
			});
		});
	});

	describe('shared', async () => {
		let node_module;

		before(done => {
			node_module = library.modules.node;
			done();
		});

		describe('getConstants', async () => {
			let getConstantsError;
			let getConstantsResult;

			beforeEach(done => {
				node_module.shared.getConstants(null, (error, result) => {
					getConstantsError = error;
					getConstantsResult = result;
					done();
				});
			});

			describe('when loaded = false', async () => {
				before(done => {
					library.rewiredModules.node.__set__('loaded', false);
					done();
				});

				it('should call callback with error = "Blockchain is loading"', done => {
					expect(getConstantsError).to.equal('Blockchain is loading');
					done();
				});

				after(done => {
					library.rewiredModules.node.__set__('loaded', true);
					done();
				});
			});

			describe('when loaded = true', async () => {
				let getLastBlockSpy;

				before(done => {
					getLastBlockSpy = sinonSandbox.spy(
						library.modules.blocks.lastBlock,
						'get'
					);
					done();
				});

				after(done => {
					sinonSandbox.restore();
					done();
				});

				it('should call modules.blocks.lastBlock.get', done => {
					expect(getLastBlockSpy).to.be.called;
					done();
				});

				it('should call callback with error = null', done => {
					expect(getConstantsError).to.be.null;
					done();
				});

				it('should call callback with result containing build = library.build', done => {
					expect(getConstantsResult).to.have.property('build', library.build);
					done();
				});

				it('should call callback with result containing commit = library.commit', done => {
					expect(getConstantsResult).to.have.property('commit', library.commit);
					done();
				});

				it('should call callback with result containing epoch = EPOCH_TIME', done => {
					expect(getConstantsResult).to.have.property('epoch', EPOCH_TIME);
					done();
				});

				it('should call callback with result containing fees = FEES', done => {
					expect(getConstantsResult).to.have.deep.property('fees', {
						send: FEES.SEND,
						vote: FEES.VOTE,
						secondSignature: FEES.SECOND_SIGNATURE,
						delegate: FEES.DELEGATE,
						multisignature: FEES.MULTISIGNATURE,
						dappRegistration: FEES.DAPP_REGISTRATION,
						dappWithdrawal: FEES.DAPP_WITHDRAWAL,
						dappDeposit: FEES.DAPP_DEPOSIT,
					});
					done();
				});

				it('should call callback with result containing nethash = library.config.nethash', done => {
					expect(getConstantsResult).to.have.property(
						'nethash',
						library.config.nethash
					);
					done();
				});

				it('should call callback with result containing nonce = library.config.nonce', done => {
					expect(getConstantsResult).to.have.property(
						'nonce',
						library.config.nonce
					);
					done();
				});

				it('should call callback with result containing milestone = blockReward.calcMilestone result', done => {
					const blockHeight = library.modules.blocks.lastBlock.get().height;
					const milestone = library.rewiredModules.node
						.__get__('blockReward')
						.calcMilestone(blockHeight);
					expect(getConstantsResult).to.have.property('milestone', milestone);
					done();
				});

				it('should call callback with result containing reward = blockReward.calcReward result', done => {
					const blockHeight = library.modules.blocks.lastBlock.get().height;
					const reward = library.rewiredModules.node
						.__get__('blockReward')
						.calcReward(blockHeight)
						.toString();
					expect(getConstantsResult).to.have.property('reward', reward);
					done();
				});

				it('should call callback with result containing supply = blockReward.calcSupply result', done => {
					const blockHeight = library.modules.blocks.lastBlock.get().height;
					const supply = library.rewiredModules.node
						.__get__('blockReward')
						.calcSupply(blockHeight);
					expect(getConstantsResult).to.have.deep.property('supply', supply);
					done();
				});

				it('should call callback with result containing version = library.config.version', done => {
					expect(getConstantsResult).to.have.property(
						'version',
						library.config.version
					);
					done();
				});
			});
		});

		describe('getStatus', async () => {
			describe('when loaded = false', async () => {
				before(done => {
					library.rewiredModules.node.__set__('loaded', false);
					done();
				});

				it('should call callback with error = "Blockchain is loading"', done => {
					node_module.shared.getStatus(null, err => {
						expect(err).to.equal('Blockchain is loading');
						done();
					});
				});

				after(done => {
					library.rewiredModules.node.__set__('loaded', true);
					done();
				});
			});

			describe('when loaded = true', async () => {
				it('should call callback with error = null', done => {
					node_module.shared.getStatus(null, err => {
						expect(err).to.not.exist;
						done();
					});
				});

				it('should return status object with properties', done => {
					node_module.shared.getStatus(null, (err, status) => {
						const properties = [
							'broadhash',
							'consensus',
							'currentTime',
							'secondsSinceEpoch',
							'height',
							'loaded',
							'networkHeight',
							'syncing',
						];
						properties.forEach(property => {
							expect(status).to.have.property(property);
						});
						expect(Object.keys(status).length).to.equal(properties.length);
						done();
					});
				});

				it('should call callback with result containing broadhash = library.components.system.getBroadhash() result', async () => {
					const broadhash = await library.components.system.getBroadhash();
					return node_module.shared.getStatus(null, (err, status) => {
						return expect(status.broadhash).to.equal(broadhash);
					});
				});

				it('should call callback with result containing consensus = modules.peers.getLastConsensus() result', done => {
					node_module.shared.getStatus(null, (err, status) => {
						expect(status.consensus).to.equal(
							library.modules.peers.getLastConsensus()
						);
						done();
					});
				});

				it('should call callback with result containing height = modules.blocks.lastBlock.get().height result', done => {
					node_module.shared.getStatus(null, (err, status) => {
						expect(status.height).to.equal(
							library.modules.blocks.lastBlock.get().height
						);
						done();
					});
				});

				it('should call callback with result containing syncing = modules.loader.syncing() result', done => {
					node_module.shared.getStatus(null, (err, status) => {
						expect(status.syncing).to.equal(library.modules.loader.syncing());
						done();
					});
				});

				it('should call callback with result containing loaded = modules.loader.loaded() result', done => {
					node_module.shared.getStatus(null, (err, status) => {
						expect(status.loaded).to.equal(library.modules.loader.loaded());
						done();
					});
				});

				describe('modules.loader.getNetwork', async () => {
					beforeEach(done => {
						stubs.networkHeight = sinonSandbox
							.stub()
							.callsFake((filters, cb) => cb(null, 123));
						const modules = library.rewiredModules.node.__get__('modules');
						modules.peers.networkHeight = stubs.networkHeight;
						done();
					});

					it('should call modules.peers.networkHeight', done => {
						node_module.shared.getStatus(null, async () => {
							expect(library.modules.peers.networkHeight).to.have.been.called;
							done();
						});
					});

					it('should call callback with result containing networkHeight = network.height', done => {
						node_module.shared.getStatus(null, (err, status) => {
							expect(status.networkHeight).to.equal(123);
							done();
						});
					});

					describe('if modules.peers.networkHeight returns networkHeight as null', async () => {
						it('should call callback with result containing networkHeight = null', done => {
							library.modules.peers.networkHeight = sinonSandbox
								.stub()
								.callsFake((filters, cb) => cb(null, null));
							node_module.shared.getStatus(null, (err, status) => {
								expect(status.networkHeight).to.equal(null);
								done();
							});
						});
					});

					afterEach(done => {
						sinonSandbox.restore();
						done();
					});
				});
			});
		});
	});

	describe('onBind', async () => {
		let rewiredNodeModule;

		before(done => {
			rewiredNodeModule = library.rewiredModules.node;
			done();
		});

		describe('modules', async () => {
			let privateModules;

			before(done => {
				privateModules = rewiredNodeModule.__get__('modules');
				done();
			});

			it('should assign blocks', done => {
				expect(privateModules).to.have.property(
					'blocks',
					library.modules.blocks
				);
				done();
			});

			it('should assign loader', done => {
				expect(privateModules).to.have.property(
					'loader',
					library.modules.loader
				);
				done();
			});

			it('should assign peers', done => {
				expect(privateModules).to.have.property('peers', library.modules.peers);
				done();
			});

			it('should assign delegates', done => {
				expect(privateModules).to.have.property(
					'delegates',
					library.modules.delegates
				);
				done();
			});
		});

		describe('components', async () => {
			let privateComponents;

			before(done => {
				privateComponents = rewiredNodeModule.__get__('components');
				done();
			});

			it('should assign blocks', done => {
				expect(privateComponents).to.have.property(
					'system',
					library.components.system
				);
				done();
			});
		});

		it('should assign loaded = true', done => {
			expect(rewiredNodeModule.__get__('loaded')).to.be.true;
			done();
		});
	});
});
