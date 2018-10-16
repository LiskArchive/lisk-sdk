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

var crypto = require('crypto');
var rewire = require('rewire');
var randomstring = require('randomstring');
var modulesLoader = require('../../common/modules_loader.js');
var randomUtil = require('../../common/utils/random');
var typeRepresentatives = require('../../fixtures/types_representatives.js');
var testData = require('./test_data/dapp.js');

const { FEES } = __testContext.config.constants;
var Dapp = rewire('../../../logic/dapp.js');
var validKeypair = testData.validKeypair;
var validSender = testData.validSender;
var validTransaction = testData.validTransaction;
var rawValidTransaction = testData.rawValidTransaction;

describe('dapp', () => {
	var dapp;
	var dbStub;

	var transaction;
	var rawTransaction;
	var sender;

	beforeEach(done => {
		dbStub = {
			dapps: {
				countByTransactionId: sinonSandbox.stub(),
				countByOutTransactionId: sinonSandbox.stub(),
				getExisting: sinonSandbox.stub(),
				list: sinonSandbox.stub(),
				getGenesis: sinonSandbox.stub(),
			},
		};
		dapp = new Dapp(
			dbStub,
			modulesLoader.scope.logger,
			modulesLoader.scope.schema,
			modulesLoader.scope.network
		);
		done();
	});

	afterEach(() => {
		return Object.keys(dbStub.dapps).forEach(key => {
			dbStub.dapps[key].reset();
		});
	});

	describe('with dummy data', () => {
		beforeEach(done => {
			transaction = _.cloneDeep(validTransaction);
			rawTransaction = _.cloneDeep(rawValidTransaction);
			sender = _.cloneDeep(validSender);
			done();
		});

		describe('constructor', () => {
			describe('private library object', () => {
				var library;

				beforeEach(done => {
					new Dapp(
						dbStub,
						modulesLoader.scope.logger,
						modulesLoader.scope.schema,
						modulesLoader.scope.network
					);
					library = Dapp.__get__('library');
					done();
				});

				it('should be updated with db stub object', () => {
					return expect(library.db).to.eql(dbStub);
				});

				it('should be loaded schema from modulesLoader', () => {
					return expect(library.schema).to.eql(modulesLoader.scope.schema);
				});

				it('should be loaded logger from modulesLoader', () => {
					return expect(library.logger).to.eql(modulesLoader.scope.logger);
				});

				it('should be loaded network from modulesLoader', () => {
					return expect(library.network).to.eql(modulesLoader.scope.network);
				});
			});
		});

		describe('bind', () => {
			it('should be okay with empty params', () => {
				return dapp.bind();
			});
		});

		describe('calculateFee', () => {
			it('should return FEES.DAPP_REGISTRATION', () => {
				return expect(
					dapp.calculateFee(transaction).isEqualTo(FEES.DAPP_REGISTRATION)
				).to.be.true;
			});
		});

		describe('verify', () => {
			describe('with invalid transaction', () => {
				describe('when receipientId exists', () => {
					it('should call callback with error = "Invalid recipient"', done => {
						transaction.recipientId = '4835566122337813671L';

						dapp.verify(transaction, sender, err => {
							expect(err).to.equal('Invalid recipient');
							done();
						});
					});
				});

				describe('when amount is not equal to 0', () => {
					it('should call callback with error = "Invalid transaction amount"', done => {
						transaction.amount = 1;

						dapp.verify(transaction, sender, err => {
							expect(err).to.equal('Invalid transaction amount');
							done();
						});
					});
				});

				describe('when dapp cateogry is undefined', () => {
					it('should call callback with error "Invalid application category"', done => {
						transaction.asset.dapp.category = undefined;

						dapp.verify(transaction, sender, err => {
							expect(err).to.equal('Invalid application category');
							done();
						});
					});
				});

				describe('when dapp cateogry not found', () => {
					it('should call callback with error "Application category not found"', done => {
						transaction.asset.dapp.category = 9;

						dapp.verify(transaction, sender, err => {
							expect(err).to.equal('Application category not found');
							done();
						});
					});
				});

				describe('when dapp icon is not link', () => {
					it('should call callback with error = "Invalid application icon link"', done => {
						transaction.asset.dapp.icon = 'random string';

						dapp.verify(transaction, sender, err => {
							expect(err).to.equal('Invalid application icon link');
							done();
						});
					});
				});

				describe('when dapp icon link is invalid', () => {
					it('should call callback with error = "Invalid application icon file type"', done => {
						transaction.asset.dapp.icon =
							'https://www.youtube.com/watch?v=de1-igivvda';

						dapp.verify(transaction, sender, err => {
							expect(err).to.equal('Invalid application icon file type');
							done();
						});
					});
				});

				describe('when dapp type is invalid', () => {
					it('should call callback with error = "Invalid application type"', done => {
						transaction.asset.dapp.type = -1;

						dapp.verify(transaction, sender, err => {
							expect(err).to.equal('Invalid application type');
							done();
						});
					});
				});

				describe('when dapp link is not in a valid url format', () => {
					it('should call callback with error = "Invalid application link"', done => {
						transaction.asset.dapp.link = 'random string';

						dapp.verify(transaction, sender, err => {
							expect(err).to.equal('Invalid application link');
							done();
						});
					});
				});

				describe('when dapp link is invalid', () => {
					it('should call callback with error = "Invalid application file type"', done => {
						transaction.asset.dapp.link =
							'https://www.youtube.com/watch?v=de1-igivvda';

						dapp.verify(transaction, sender, err => {
							expect(err).to.equal('Invalid application file type');
							done();
						});
					});
				});

				describe('when dapp name is blank', () => {
					it('should call callback with error = "Application name must not be blank"', done => {
						transaction.asset.dapp.name = '  ';

						dapp.verify(transaction, sender, err => {
							expect(err).to.equal('Application name must not be blank');
							done();
						});
					});
				});

				describe('when dapp name starts and ends with space', () => {
					it('should call callback with error = "Application name must not be blank"', done => {
						transaction.asset.dapp.name = ' randomname ';

						dapp.verify(transaction, sender, err => {
							expect(err).to.equal('Application name must not be blank');
							done();
						});
					});
				});

				describe('when dapp name is longer than 32 characters', () => {
					it('should call callback with error = "Application name is too long. Maximum is 32 characters"', done => {
						transaction.asset.dapp.name = Array(...Array(33))
							.map(() => {
								return 'a';
							})
							.join('');

						dapp.verify(transaction, sender, err => {
							expect(err).to.equal(
								'Application name is too long. Maximum is 32 characters'
							);
							done();
						});
					});
				});

				describe('when dapp description is longer than 160 characters', () => {
					it('should call callback with error = "Application description is too long. Maximum is 160 characters"', done => {
						transaction.asset.dapp.description = Array(...Array(161))
							.map(() => {
								return 'a';
							})
							.join('');

						dapp.verify(transaction, sender, err => {
							expect(err).to.equal(
								'Application description is too long. Maximum is 160 characters'
							);
							done();
						});
					});
				});

				describe('when dapp tags are longer than 160 characters', () => {
					it('should call callback with error = "Application tags is too long. Maximum is 160 characters"', done => {
						transaction.asset.dapp.tags = Array(...Array(161))
							.map(() => {
								return 'a';
							})
							.join('');

						dapp.verify(transaction, sender, err => {
							expect(err).to.equal(
								'Application tags is too long. Maximum is 160 characters'
							);
							done();
						});
					});
				});

				describe('when dapp tags duplicate', () => {
					it('should call callback with error = "Encountered duplicate tag: a in application"', done => {
						transaction.asset.dapp.tags = Array(...Array(3))
							.map(() => {
								return 'a';
							})
							.join();

						dapp.verify(transaction, sender, err => {
							expect(err).to.equal(
								'Encountered duplicate tag: a in application'
							);
							done();
						});
					});
				});

				describe('when dbStub rejects proimse', () => {
					var dbError = new Error();

					it('should call callback with error = "DApp#verify error"', done => {
						dbStub.dapps.getExisting
							.withArgs({
								name: transaction.asset.dapp.name,
								link: transaction.asset.dapp.link || null,
								transactionId: transaction.id,
							})
							.rejects(dbError);

						dapp.verify(transaction, sender, err => {
							expect(err).to.equal('DApp#verify error');
							done();
						});
					});
				});

				describe('when dbStub resolves with application', () => {
					var dappParams;

					beforeEach(done => {
						dappParams = {
							name: transaction.asset.dapp.name,
							link: transaction.asset.dapp.link || null,
							transactionId: transaction.id,
						};
						done();
					});

					// TODO: Some of the code these tests are testing is redundant. We should review and refactor it.
					it('should call callback with error', done => {
						dbStub.dapps.getExisting.withArgs(dappParams).resolves([
							{
								name: transaction.asset.dapp.name,
							},
						]);

						dapp.verify(transaction, sender, err => {
							expect(err).to.equal(
								`Application name already exists: ${
									transaction.asset.dapp.name
								}`
							);
							done();
						});
					});

					it('should call callback with error if application link already exists', done => {
						dbStub.dapps.getExisting.withArgs(dappParams).resolves([
							{
								link: transaction.asset.dapp.link,
							},
						]);

						dapp.verify(transaction, sender, err => {
							expect(err).to.equal(
								`Application link already exists: ${
									transaction.asset.dapp.link
								}`
							);
							done();
						});
					});

					it('should call callback with error if application already exists', done => {
						dbStub.dapps.getExisting
							.withArgs({
								name: transaction.asset.dapp.name,
								link: transaction.asset.dapp.link || null,
								transactionId: transaction.id,
							})
							.resolves([{ tags: 'a,b,c' }]);

						dapp.verify(transaction, sender, err => {
							expect(err).to.equal('Application already exists');
							done();
						});
					});
				});
			});

			describe('when transaction is valid', () => {
				beforeEach(() => {
					return dbStub.dapps.getExisting
						.withArgs({
							name: transaction.asset.dapp.name,
							link: transaction.asset.dapp.link || null,
							transactionId: transaction.id,
						})
						.resolves([]);
				});

				it('should call callback with error = null and transaction for valid transaction type', done => {
					transaction.asset.dapp.type = 2;

					dapp.verify(transaction, sender, err => {
						expect(err).to.equal('Invalid application type');
						done();
					});
				});

				it('should call dbStub.query with correct params', done => {
					dapp.verify(transaction, sender, () => {
						expect(dbStub.dapps.getExisting.calledOnce).to.equal(true);
						expect(
							dbStub.dapps.getExisting.calledWithExactly({
								name: transaction.asset.dapp.name,
								link: transaction.asset.dapp.link || null,
								transactionId: transaction.id,
							})
						).to.equal(true);
						done();
					});
				});

				it('should call callback with error = null and transaction', done => {
					dapp.verify(transaction, sender, (err, res) => {
						expect(err).to.not.exist;
						expect(res).to.eql(transaction);
						done();
					});
				});
			});
		});

		describe('process', () => {
			describe('with valid transaction', () => {
				it('should call the callback with error = null', done => {
					dapp.process(transaction, sender, done);
				});
			});
		});

		describe('getBytes', () => {
			describe('when transaction.asset.dapp = undefined', () => {
				beforeEach(done => {
					transaction.asset.dapp = undefined;
					done();
				});

				it('should throw', () => {
					return expect(dapp.getBytes.bind(null, transaction)).to.throw();
				});
			});

			describe('when transaction.asset.dapp.category = undefined', () => {
				beforeEach(done => {
					transaction.asset.dapp.category = undefined;
					done();
				});

				it('should throw', () => {
					return expect(dapp.getBytes.bind(null, transaction)).to.throw();
				});
			});

			describe('when transaction.asset.dapp.type = undefined', () => {
				beforeEach(done => {
					transaction.asset.dapp.type = undefined;
					done();
				});

				it('should throw', () => {
					return expect(dapp.getBytes.bind(null, transaction)).to.throw();
				});
			});

			describe('when transaction.asset.dapp is a valid asset', () => {
				it('should not throw', () => {
					return expect(dapp.getBytes.bind(null, transaction)).not.to.throw();
				});

				it('should get bytes of valid transaction', () => {
					return expect(dapp.getBytes(transaction).toString('hex')).to.equal(
						'414f37657a42313143674364555a69356f38597a784341746f524c41364669687474703a2f2f7777772e6c69736b2e696f2f414f37657a42313143674364555a69356f38597a784341746f524c413646692e7a69700100000002000000'
					);
				});

				it('should return result as a Buffer type', () => {
					return expect(dapp.getBytes(transaction)).to.be.instanceOf(Buffer);
				});
			});
		});

		describe('applyConfirmed', () => {
			var dummyBlock = {
				id: '9314232245035524467',
				height: 1,
			};

			var unconfirmedNames;
			var unconfirmedLinks;

			beforeEach(done => {
				unconfirmedNames = Dapp.__get__('__private.unconfirmedNames');
				unconfirmedLinks = Dapp.__get__('__private.unconfirmedLinks');
				done();
			});

			it('should update private unconfirmed name variable', done => {
				dapp.applyConfirmed(transaction, dummyBlock, sender, () => {
					expect(unconfirmedNames[transaction.asset.dapp.name]).to.not.exist;
					done();
				});
			});

			it('should update private unconfirmed links variable', done => {
				dapp.applyConfirmed(transaction, dummyBlock, sender, () => {
					expect(unconfirmedLinks[transaction.asset.dapp.link]).to.not.exist;
					done();
				});
			});
		});

		describe('undoConfirmed', () => {
			describe('with vaid parameters', () => {
				var dummyBlock = {
					id: '9314232245035524467',
					height: 1,
				};

				it('should call the callback function', done => {
					dapp.undoConfirmed(transaction, dummyBlock, sender, done);
				});
			});
		});

		describe('applyUnconfirmed', () => {
			describe('when unconfirmed names already exists', () => {
				beforeEach(() => {
					var dappNames = {};
					dappNames[transaction.asset.dapp.name] = true;
					Dapp.__set__('__private.unconfirmedNames', dappNames);
					return Dapp.__set__('__private.unconfirmedLinks', {});
				});

				it('should call callback with error', done => {
					dapp.applyUnconfirmed(transaction, sender, err => {
						expect(err).to.equal('Application name already exists');
						done();
					});
				});
			});

			describe('when unconfirmed link already exists', () => {
				beforeEach(() => {
					var dappLinks = {};
					dappLinks[transaction.asset.dapp.link] = true;
					Dapp.__set__('__private.unconfirmedLinks', dappLinks);
					return Dapp.__set__('__private.unconfirmedNames', {});
				});

				it('should call callback with error', done => {
					dapp.applyUnconfirmed(transaction, sender, err => {
						expect(err).to.equal('Application link already exists');
						done();
					});
				});
			});

			describe('when unconfirmed dapp does not exist', () => {
				var unconfirmedNames;
				var unconfirmedLinks;

				beforeEach(done => {
					var dappNames = {};
					var dappLinks = {};
					Dapp.__set__('__private.unconfirmedLinks', dappLinks);
					Dapp.__set__('__private.unconfirmedNames', dappNames);
					unconfirmedNames = Dapp.__get__('__private.unconfirmedNames');
					unconfirmedLinks = Dapp.__get__('__private.unconfirmedLinks');
					done();
				});

				it('should update unconfirmed name private variable', done => {
					dapp.applyUnconfirmed(transaction, sender, () => {
						expect(unconfirmedNames[transaction.asset.dapp.name]).to.equal(
							true
						);
						done();
					});
				});

				it('should update unconfirmed link private variable', done => {
					dapp.applyUnconfirmed(transaction, sender, () => {
						expect(unconfirmedLinks[transaction.asset.dapp.link]).to.equal(
							true
						);
						done();
					});
				});

				it('should call callback with error = undefined', done => {
					dapp.applyUnconfirmed(transaction, sender, () => {
						done();
					});
				});
			});
		});

		describe('undoUnconfirmed', () => {
			var unconfirmedNames;
			var unconfirmedLinks;

			beforeEach(done => {
				var dappNames = {};
				var dappLinks = {};
				Dapp.__set__('__private.unconfirmedLinks', dappLinks);
				Dapp.__set__('__private.unconfirmedNames', dappNames);
				unconfirmedNames = Dapp.__get__('__private.unconfirmedNames');
				unconfirmedLinks = Dapp.__get__('__private.unconfirmedLinks');
				done();
			});

			it('should delete unconfirmed name private variable', done => {
				dapp.undoUnconfirmed(transaction, sender, () => {
					expect(unconfirmedNames[transaction.asset.dapp.name]).not.exist;
					done();
				});
			});

			it('should delete unconfirmed link private variable', done => {
				dapp.undoUnconfirmed(transaction, sender, () => {
					expect(unconfirmedLinks[transaction.asset.dapp.link]).not.exist;
					done();
				});
			});

			it('should call callback with error = undefined', done => {
				dapp.undoUnconfirmed(transaction, sender, () => {
					done();
				});
			});
		});

		describe('objectNormalize', () => {
			describe('using undefined properties in the dapp asset', () => {
				var invalidProperties = {
					dummyUndefinedProperty: undefined,
					dummpyNullProperty: null,
				};

				beforeEach(done => {
					transaction.asset.dapp = _.assign(
						transaction.asset.dapp,
						invalidProperties
					);
					done();
				});

				it('should remove undefined properties', () => {
					transaction = dapp.objectNormalize(transaction);
					return expect(transaction).to.not.have.property(
						'dummyUndefinedProperty'
					);
				});

				it('should remove null properties', () => {
					transaction = dapp.objectNormalize(transaction);
					return expect(transaction).to.not.have.property('dummpyNullProperty');
				});
			});

			describe('schema properties', () => {
				var library;
				var schemaSpy;

				beforeEach(done => {
					library = Dapp.__get__('library');
					schemaSpy = sinonSandbox.spy(library.schema, 'validate');
					done();
				});

				afterEach(() => {
					return schemaSpy.restore();
				});

				it('should use the correct format to validate against', () => {
					dapp.objectNormalize(transaction);
					expect(schemaSpy.calledOnce).to.equal(true);
					return expect(
						schemaSpy.calledWithExactly(
							transaction.asset.dapp,
							Dapp.prototype.schema
						)
					).to.equal(true);
				});
			});

			describe('dynamic schema tests', () => {
				describe('category', () => {
					var invalidTypes = _.difference(
						typeRepresentatives.allTypes,
						typeRepresentatives.positiveIntegers,
						typeRepresentatives.negativeIntegers,
						typeRepresentatives.others
					);

					var otherTypes = typeRepresentatives.others;

					var invalidCategoriesNumber = [-1, -2, 0.1, 9, 10];
					var validCategories = [0, 1, 2, 3, 4, 5, 6, 7, 8];

					invalidTypes.forEach(type => {
						it(`should throw error for: ${type.description}`, () => {
							transaction.asset.dapp.category = type.input;
							return expect(
								dapp.objectNormalize.bind(null, transaction)
							).to.throw(
								`Failed to validate dapp schema: Expected type integer but found type ${
									type.expectation
								}`
							);
						});
					});

					otherTypes.forEach(type => {
						it(`should throw error for: ${type.description}`, () => {
							transaction.asset.dapp.category = type.input;
							return expect(
								dapp.objectNormalize.bind(null, transaction)
							).to.throw();
						});
					});

					invalidCategoriesNumber.forEach(input => {
						it(`should throw error for value: ${input}`, () => {
							transaction.asset.dapp.category = input;
							return expect(
								dapp.objectNormalize.bind(null, transaction)
							).to.throw();
						});
					});

					validCategories.forEach(input => {
						it(`should not throw error for valid value: ${input}`, () => {
							transaction.asset.dapp.category = input;
							return dapp.objectNormalize(transaction);
						});
					});
				});

				describe('name', () => {
					var invalidTypes = _.difference(
						typeRepresentatives.allTypes,
						typeRepresentatives.strings,
						typeRepresentatives.others
					);

					var otherTypes = typeRepresentatives.others;

					var invalidNames = [
						'',
						_.fill(new Array(33), 'a'),
						_.fill(new Array(34), 'b'),
					];
					var validNames = _.fill(new Array(5), 'a').map(() => {
						return randomUtil.applicationName();
					});

					invalidTypes.forEach(type => {
						it(`should throw error for: ${type.description}`, () => {
							transaction.asset.dapp.name = type.input;
							return expect(
								dapp.objectNormalize.bind(null, transaction)
							).to.throw(
								`Failed to validate dapp schema: Expected type string but found type ${
									type.expectation
								}`
							);
						});
					});

					otherTypes.forEach(type => {
						it(`should throw error for: ${type.description}`, () => {
							transaction.asset.dapp.name = type.input;
							return expect(
								dapp.objectNormalize.bind(null, transaction)
							).to.throw();
						});
					});

					invalidNames.forEach(input => {
						it(`should throw error for value: ${input}`, () => {
							transaction.asset.dapp.name = input;
							return expect(
								dapp.objectNormalize.bind(null, transaction)
							).to.throw();
						});
					});

					validNames.forEach(input => {
						it(`should not throw error for value: ${input}`, () => {
							transaction.asset.dapp.name = input;
							return expect(
								dapp.objectNormalize.bind(null, transaction)
							).not.throw();
						});
					});
				});

				describe('description', () => {
					var invalidTypes = _.difference(
						typeRepresentatives.allTypes,
						typeRepresentatives.strings,
						typeRepresentatives.others
					);

					var invalidDescriptions = [
						_.fill(new Array(161), 'a'),
						_.fill(new Array(162), 'b'),
					];
					var validDescriptions = _.fill(new Array(33), 'a').map(() => {
						return randomstring.generate(Math.random() * 160);
					});

					invalidTypes.forEach(type => {
						it(`should throw error for: ${type.description}`, () => {
							transaction.asset.dapp.description = type.input;
							return expect(
								dapp.objectNormalize.bind(null, transaction)
							).to.throw(
								`Failed to validate dapp schema: Expected type string but found type ${
									type.expectation
								}`
							);
						});
					});

					invalidDescriptions.forEach(input => {
						it(`should throw error for value: ${input}`, () => {
							transaction.asset.dapp.description = input;
							return expect(
								dapp.objectNormalize.bind(null, transaction)
							).to.throw();
						});
					});

					validDescriptions.forEach(input => {
						it(`should not throw error for value: ${input}`, () => {
							transaction.asset.dapp.description = input;
							return expect(
								dapp.objectNormalize.bind(null, transaction)
							).to.not.throw();
						});
					});
				});

				describe('tags', () => {
					var invalidTypes = _.difference(
						typeRepresentatives.allTypes,
						typeRepresentatives.strings,
						typeRepresentatives.others
					);

					var invalidTags = [
						_.fill(new Array(161), 'a'),
						_.fill(new Array(81), 'b').join(),
					];

					var validTags = [
						_.fill(
							new Array(_.toInteger(Math.random() * 80)),
							randomstring.generate(1)
						).join(),
						'adventure, fantasy',
					];

					invalidTypes.forEach(type => {
						it(`should throw error for: ${type.description}`, () => {
							transaction.asset.dapp.tags = type.input;
							return expect(
								dapp.objectNormalize.bind(null, transaction)
							).to.throw(
								`Failed to validate dapp schema: Expected type string but found type ${
									type.expectation
								}`
							);
						});
					});

					invalidTags.forEach(input => {
						it(`should throw error for value: ${input}`, () => {
							transaction.asset.dapp.tags = input;
							return expect(
								dapp.objectNormalize.bind(null, transaction)
							).to.throw();
						});
					});

					validTags.forEach(input => {
						it(`should not throw error for value: ${input}`, () => {
							transaction.asset.dapp.tags = input;
							return expect(
								dapp.objectNormalize.bind(null, transaction)
							).to.not.throw();
						});
					});
				});

				describe('type', () => {
					var invalidTypes = _.difference(
						typeRepresentatives.allTypes,
						typeRepresentatives.positiveIntegers,
						typeRepresentatives.negativeIntegers,
						typeRepresentatives.others
					);

					var otherTypes = typeRepresentatives.others;
					// No max limit set on type. Type verification is partially handled here
					// and the rest is handled in verify function.
					// TODO: Do stronger schema checks
					var validTypes = [1, 2, 4, 11].concat(
						_.map(typeRepresentatives.positiveIntegers, 'input')
					);
					invalidTypes.forEach(type => {
						it(`should throw error for: ${type.description}`, () => {
							transaction.asset.dapp.type = type.input;
							return expect(
								dapp.objectNormalize.bind(null, transaction)
							).to.throw(
								`Failed to validate dapp schema: Expected type integer but found type ${
									type.expectation
								}`
							);
						});
					});

					otherTypes.forEach(type => {
						it(`should throw error for: ${type.description}`, () => {
							transaction.asset.dapp.type = type.input;
							return expect(
								dapp.objectNormalize.bind(null, transaction)
							).to.throw();
						});
					});

					invalidTypes.forEach(input => {
						it(`should throw error for value: ${input}`, () => {
							transaction.asset.dapp.type = input;
							return expect(
								dapp.objectNormalize.bind(null, transaction)
							).to.throw();
						});
					});

					validTypes.forEach(input => {
						it(`should not throw error for value: ${input}`, () => {
							transaction.asset.dapp.type = input;
							return expect(
								dapp.objectNormalize.bind(null, transaction)
							).to.not.throw();
						});
					});
				});

				describe('link', () => {
					var invalidTypes = _.difference(
						typeRepresentatives.allTypes,
						typeRepresentatives.strings,
						typeRepresentatives.others
					);

					// TODO: Schema checks only check whether property is a string or not,
					// and not whether value is actually a link. We need to handle it here.
					var invalidLinks = [
						_.fill(new Array(2002), 'a'),
						_.fill(new Array(2001), 'a'),
					];
					var validLinks = _.fill(new Array(5), '').map(() => {
						return randomUtil.applicationName();
					});

					invalidTypes.forEach(type => {
						it(`should throw error for: ${type.description}`, () => {
							transaction.asset.dapp.link = type.input;
							return expect(
								dapp.objectNormalize.bind(null, transaction)
							).to.throw(
								`Failed to validate dapp schema: Expected type string but found type ${
									type.expectation
								}`
							);
						});
					});

					invalidLinks.forEach(input => {
						it(`should throw error for value: ${input}`, () => {
							transaction.asset.dapp.link = input;
							return expect(
								dapp.objectNormalize.bind(null, transaction)
							).to.throw();
						});
					});

					validLinks.forEach(input => {
						it(`should not throw error for value: ${input}`, () => {
							transaction.asset.dapp.link = input;
							return expect(
								dapp.objectNormalize.bind(null, transaction)
							).to.not.throw();
						});
					});
				});

				describe('icon', () => {
					var invalidTypes = _.difference(
						typeRepresentatives.allTypes,
						typeRepresentatives.strings,
						typeRepresentatives.others
					);

					// TODO: Schema checks only check whether property is a string or not,
					// and not whether value is actually a link. We need to handle it here.
					var invalidIcons = [
						_.fill(new Array(2002), 'a'),
						_.fill(new Array(2001), 'a'),
					];
					var validIcons = _.fill(new Array(5), '').map(() => {
						return randomUtil.applicationName();
					});

					invalidTypes.forEach(type => {
						it(`should throw error for: ${type.description}`, () => {
							transaction.asset.dapp.icon = type.input;
							return expect(
								dapp.objectNormalize.bind(null, transaction)
							).to.throw(
								`Failed to validate dapp schema: Expected type string but found type ${
									type.expectation
								}`
							);
						});
					});

					invalidIcons.forEach(input => {
						it(`should throw error for value: ${input}`, () => {
							transaction.asset.dapp.icon = input;
							return expect(
								dapp.objectNormalize.bind(null, transaction)
							).to.throw();
						});
					});

					validIcons.forEach(input => {
						it(`should not throw error for value: ${input}`, () => {
							transaction.asset.dapp.icon = input;
							return expect(
								dapp.objectNormalize.bind(null, transaction)
							).to.not.throw();
						});
					});
				});
			});

			it('should return transaction when asset is valid', () => {
				return expect(dapp.objectNormalize(transaction)).to.eql(transaction);
			});
		});

		describe('dbRead', () => {
			describe('when rawTransaction.dapp_name does not exist', () => {
				beforeEach(() => {
					return delete rawTransaction.dapp_name;
				});

				it('should return null', () => {
					return expect(dapp.dbRead(rawTransaction)).to.eql(null);
				});
			});

			describe('when rawTransaction.dapp_name exists', () => {
				it('should return result containing dapp property', () => {
					return expect(dapp.dbRead(rawTransaction)).to.have.property('dapp');
				});

				it('should return result containing nested dapp_category property', () => {
					return expect(dapp.dbRead(rawTransaction))
						.to.have.nested.property('dapp.category')
						.to.equal(rawTransaction.dapp_category);
				});

				it('should return result containing nested dapp_description property', () => {
					return expect(dapp.dbRead(rawTransaction))
						.to.have.nested.property('dapp.description')
						.to.eql(rawTransaction.dapp_description);
				});

				it('should return result containing nested dapp.icon property', () => {
					return expect(dapp.dbRead(rawTransaction))
						.to.have.nested.property('dapp.icon')
						.to.eql(rawTransaction.dapp_icon);
				});

				it('should return result containing nested dapp.link property', () => {
					return expect(dapp.dbRead(rawTransaction))
						.to.have.nested.property('dapp.link')
						.to.eql(rawTransaction.dapp_link);
				});

				it('should return result containing nested dapp.name property', () => {
					return expect(dapp.dbRead(rawTransaction))
						.to.have.nested.property('dapp.name')
						.to.eql(rawTransaction.dapp_name);
				});

				it('should return result containing nested dapp.tags property', () => {
					return expect(dapp.dbRead(rawTransaction))
						.to.have.nested.property('dapp.tags')
						.to.eql(rawTransaction.dapp_tags);
				});

				it('should return result containing nested dapp.type property', () => {
					return expect(dapp.dbRead(rawTransaction))
						.to.have.nested.property('dapp.type')
						.to.eql(rawTransaction.dapp_type);
				});
			});
		});

		describe('ready', () => {
			it('should return true for single signature transaction', () => {
				return expect(dapp.ready(transaction, sender)).to.equal(true);
			});

			it('should return false for multi signature transaction with less signatures', () => {
				sender.multisignatures = [validKeypair.publicKey.toString('hex')];

				return expect(dapp.ready(transaction, sender)).to.equal(false);
			});

			it('should return true for multi signature transaction with alteast min signatures', () => {
				sender.multisignatures = [validKeypair.publicKey.toString('hex')];
				sender.multimin = 1;

				delete transaction.signature;
				// Not really correct signature, but we are not testing that over here
				transaction.signature = crypto.randomBytes(64).toString('hex');
				transaction.signatures = [crypto.randomBytes(64).toString('hex')];

				return expect(dapp.ready(transaction, sender)).to.equal(true);
			});
		});
	});
});
