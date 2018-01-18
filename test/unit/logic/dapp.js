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
'use strict';/*eslint*/

var crypto = require('crypto');

var rewire = require('rewire');
var randomstring = require('randomstring');


var ed = require('../../../helpers/ed');
var modulesLoader = require('../../common/modulesLoader.js');

var randomUtil = require('../../common/utils/random');

var Dapp = rewire('../../../logic/dapp.js');
var constants = require('../../../helpers/constants');

var typeRepresentatives = require('../../fixtures/typesRepresentatives.js');

var testData = require('./testData/dapp.js');

var validPassword = testData.validPassword;
var validKeypair = testData.validKeypair;
var senderHash = testData.senderHash;
var senderKeypair = testData.senderKeypair;
var validSender = testData.validSender;
var validTransaction = testData.validTransaction;
var rawValidTransaction = testData.rawValidTransaction;

describe('dapp', function () {

	var dapp;
	var dbStub;

	var transaction;
	var rawTransaction;
	var sender;

	beforeEach(function () {
		dbStub = {
			dapps: {
				countByTransactionId: sinonSandbox.stub(),
				countByOutTransactionId: sinonSandbox.stub(),
				getExisting: sinonSandbox.stub(),
				list: sinonSandbox.stub(),
				getGenesis: sinonSandbox.stub()
			}
		};
		dapp = new Dapp(dbStub, modulesLoader.scope.logger, modulesLoader.scope.schema, modulesLoader.scope.network);
	});

	afterEach(function () {
		Object.keys(dbStub.dapps).forEach(function (key) {
			dbStub.dapps[key].reset();
		});
	});

	describe('with dummy data', function () {

		beforeEach(function () {
			transaction = _.cloneDeep(validTransaction);
			rawTransaction = _.cloneDeep(rawValidTransaction);
			sender = _.cloneDeep(validSender);
		});

		describe('constructor', function () {

			describe('private library object should be updated', function () {

				var library;

				beforeEach(function () {
					new Dapp(dbStub, modulesLoader.scope.logger, modulesLoader.scope.schema, modulesLoader.scope.network);
					library =Dapp.__get__('library');
				});

				it('should attach dbStub', function () {
					library.db.should.eql(dbStub);
				});

				it('should attach dbStub', function () {
					library.schema.should.eql(modulesLoader.scope.schema);
				});

				it('should attach logger', function () {
					library.logger.should.eql(modulesLoader.scope.logger);
				});

				it('should attach logger', function () {
					library.network.should.eql(modulesLoader.scope.network);
				});
			});
		});

		describe('bind', function () {

			it('should be okay with empty params', function () {
				dapp.bind();
			});
		});

		describe('calculateFee', function () {

			it('should return constants.fees.dappRegistration', function () {
				dapp.calculateFee(transaction).should.equal(constants.fees.dappRegistration);
			});
		});

		describe('verify', function () {

			describe('with invalid transaction', function () {

				describe('when receipientId exists', function () {

					it('should call callback with error = "Invalid recipient"', function (done) {
						transaction.recipientId = '4835566122337813671L';

						dapp.verify(transaction, sender, function (err) {
							err.should.equal('Invalid recipient');
							done();
						});
					});
				});

				describe('when amount is not equal to 0', function () {

					it('should call callback with error = "Invalid transaction amount"', function (done) {
						transaction.amount = 1;

						dapp.verify(transaction, sender, function (err) {
							err.should.equal('Invalid transaction amount');
							done();
						});
					});
				});

				describe('when dapp cateogry is undefined', function () {

					it('should call callback with error "Invalid application category"', function (done) {
						transaction.asset.dapp.category = undefined;

						dapp.verify(transaction, sender, function (err) {
							err.should.equal('Invalid application category');
							done();
						});
					});
				});

				describe('when dapp cateogry not found', function () {

					it('should call callback with error "Application category not found"', function (done) {
						transaction.asset.dapp.category = 9;

						dapp.verify(transaction, sender, function (err) {
							err.should.equal('Application category not found');
							done();
						});
					});
				});

				describe('when dapp icon is not link', function () {

					it('should call callback with error = "Invalid application icon link"', function (done) {
						transaction.asset.dapp.icon = 'random string';

						dapp.verify(transaction, sender, function (err) {
							err.should.equal('Invalid application icon link');
							done();
						});
					});
				});

				describe('when dapp icon link is invalid', function () {

					it('should call callback with error = "Invalid application icon file type"', function (done) {
						transaction.asset.dapp.icon = 'https://www.youtube.com/watch?v=de1-igivvda';

						dapp.verify(transaction, sender, function (err) {
							err.should.equal('Invalid application icon file type');
							done();
						});
					});
				});

				describe('when dapp type is invalid', function () {

					it('should call callback with error = "Invalid application type"', function (done) {
						transaction.asset.dapp.type = -1;

						dapp.verify(transaction, sender, function (err) {
							err.should.equal('Invalid application type');
							done();
						});
					});
				});

				describe('when dapp link is not in a valid url format', function () {

					it('should call callback with error = "Invalid application link"', function (done) {
						transaction.asset.dapp.link = 'random string';

						dapp.verify(transaction, sender, function (err) {
							err.should.equal('Invalid application link');
							done();
						});
					});
				});

				describe('when dapp link is invalid', function () {

					it('should call callback with error = "Invalid application file type"', function (done) {
						transaction.asset.dapp.link = 'https://www.youtube.com/watch?v=de1-igivvda';

						dapp.verify(transaction, sender, function (err) {
							err.should.equal('Invalid application file type');
							done();
						});
					});
				});

				describe('when dapp name is blank', function () {
					it('should call callback with error = "Application name must not be blank"', function (done) {
						transaction.asset.dapp.name = '  ';

						dapp.verify(transaction, sender, function (err) {
							err.should.equal('Application name must not be blank');
							done();
						});
					});
				});

				describe('when dapp name starts and ends with space', function () {

					it('should call callback with error = "Application name must not be blank"', function (done) {
						transaction.asset.dapp.name = ' randomname ';

						dapp.verify(transaction, sender, function (err) {
							err.should.equal('Application name must not be blank');
							done();
						});
					});
				});

				describe('when dapp name is longer than 32 characters', function () {

					it('should call callback with error = "Application name is too long. Maximum is 32 characters"', function (done) {
						transaction.asset.dapp.name = Array.apply(null, Array(33)).map(function () { return 'a';}).join('');

						dapp.verify(transaction, sender, function (err) {
							err.should.equal('Application name is too long. Maximum is 32 characters');
							done();
						});
					});
				});

				describe('when dapp description is longer than 160 characters', function () {

					it('should call callback with error = "Application description is too long. Maximum is 160 characters"', function (done) {
						transaction.asset.dapp.description = Array.apply(null, Array(161)).map(function () { return 'a';}).join('');

						dapp.verify(transaction, sender, function (err) {
							err.should.equal('Application description is too long. Maximum is 160 characters');
							done();
						});
					});
				});

				describe('when dapp tags are longer than 160 characters', function () {

					it('should call callback with error = "Application tags is too long. Maximum is 160 characters"', function (done) {
						transaction.asset.dapp.tags = Array.apply(null, Array(161)).map(function () { return 'a';}).join('');

						dapp.verify(transaction, sender, function (err) {
							err.should.equal('Application tags is too long. Maximum is 160 characters');
							done();
						});
					});
				});

				describe('when dapp tags duplicate', function () {

					it('should call callback with error = "Encountered duplicate tag: a in application"', function (done) {
						transaction.asset.dapp.tags = Array.apply(null, Array(3)).map(function () { return 'a';}).join(',');

						dapp.verify(transaction, sender, function (err) {
							err.should.equal('Encountered duplicate tag: a in application');
							done();
						});
					});
				});

				describe('when dbStub rejects proimse', function () {

					var dbError = new Error();

					it('should call callback with error = "DApp#verify error"', function (done) {
						dbStub.dapps.getExisting.withArgs({
							name: transaction.asset.dapp.name,
							link: transaction.asset.dapp.link || null,
							transactionId: transaction.id
						}).rejects(dbError);

						dapp.verify(transaction, sender, function (err) {
							err.should.equal('DApp#verify error');
							done();
						});
					});
				});

				describe('when dbStub resolves with application', function () {

					var dappParams;

					beforeEach(function () {
						dappParams = {
							name: transaction.asset.dapp.name,
							link: transaction.asset.dapp.link || null,
							transactionId: transaction.id
						};
					});

					// TODO: Some of the code these tests are testing is redundant. We should review and refactor it.
					it('should call callback with error', function (done) {
						dbStub.dapps.getExisting.withArgs(dappParams).resolves([{
							name: transaction.asset.dapp.name
						}]);

						dapp.verify(transaction, sender, function (err) {
							err.should.equal('Application name already exists: ' + transaction.asset.dapp.name);
							done();
						});
					});

					it('should call callback with error if application link already exists', function (done) {

						dbStub.dapps.getExisting.withArgs(dappParams).resolves([{
							link: transaction.asset.dapp.link
						}]);

						dapp.verify(transaction, sender, function (err) {
							err.should.equal('Application link already exists: ' + transaction.asset.dapp.link);
							done();
						});
					});

					it('should call callback with error if application already exists', function (done) {
						dbStub.dapps.getExisting.withArgs({
							name: transaction.asset.dapp.name,
							link: transaction.asset.dapp.link || null,
							transactionId: transaction.id
						}).resolves([{tags: 'a,b,c'}]);

						dapp.verify(transaction, sender, function (err) {
							err.should.equal('Application already exists');
							done();
						});
					});
				});
			});

			describe('when transaction is valid', function (done) {

				beforeEach(function () {
					dbStub.dapps.getExisting.withArgs({
						name: transaction.asset.dapp.name,
						link: transaction.asset.dapp.link || null,
						transactionId: transaction.id
					}).resolves([]);
				});

				it('should call callback with error = null and transaction for valid transaction type', function (done) {
					transaction.asset.dapp.type = 2;

					dapp.verify(transaction, sender, function (err) {
						err.should.equal('Invalid application type');
						done();
					});
				});

				it('should call dbStub.query with correct params', function (done) {
					dapp.verify(transaction, sender, function (err, res) {
						dbStub.dapps.getExisting.calledOnce.should.equal(true);
						dbStub.dapps.getExisting.calledWithExactly({
							name: transaction.asset.dapp.name,
							link: transaction.asset.dapp.link || null,
							transactionId: transaction.id
						}).should.be.true;
						done();
					});
				});

				it('should call callback with error = null and transaction', function (done) {
					dapp.verify(transaction, sender, function (err, res) {
						should.not.exist(err);
						res.should.eql(transaction);
						done();
					});
				});
			});
		});

		describe('process', function () {

			describe('with valid transaction', function () {

				it('should call the callback with error = null', function (done) {
					dapp.process(transaction, sender, done);
				});
			});
		});

		describe('getBytes', function () {

			describe('when transaction.asset.dapp = undefined', function () {

				beforeEach(function () {
					transaction.asset.dapp = undefined;
				});

				it('should throw', function () {
					dapp.getBytes.bind(null, transaction).should.throw();
				});
			});

			describe('when transaction.asset.dapp.category = undefined', function () {

				beforeEach(function () {
					transaction.asset.dapp.category = undefined;
				});

				it('should throw', function () {
					dapp.getBytes.bind(null, transaction).should.throw();
				});
			});

			describe('when transaction.asset.dapp.type = undefined', function () {

				beforeEach(function () {
					transaction.asset.dapp.type = undefined;
				});

				it('should throw', function () {
					dapp.getBytes.bind(null, transaction).should.throw();
				});
			});

			describe('when transaction.asset.dapp is a valid asset', function () {

				it('should not throw', function () {
					dapp.getBytes.bind(null, transaction).should.not.to.throw();
				});

				it('should get bytes of valid transaction', function () {
					dapp.getBytes(transaction).toString('hex').should.equal('414f37657a42313143674364555a69356f38597a784341746f524c41364669687474703a2f2f7777772e6c69736b2e696f2f414f37657a42313143674364555a69356f38597a784341746f524c413646692e7a69700100000002000000');
				});

				it('should return result as a Buffer type', function () {
					dapp.getBytes(transaction).should.be.instanceOf(Buffer);
				});
			});
		});

		describe('apply', function () {

			var dummyBlock = {
				id: '9314232245035524467',
				height: 1
			};

			var unconfirmedNames;
			var unconfirmedLinks;

			beforeEach(function () {
				unconfirmedNames = Dapp.__get__('__private.unconfirmedNames');
				unconfirmedLinks = Dapp.__get__('__private.unconfirmedLinks');
			});

			it('should update private unconfirmed name variable', function (done) {
				dapp.apply(transaction, dummyBlock, sender, function (err, cb) {
					should.not.exist(unconfirmedNames[transaction.asset.dapp.name]);
					done();
				});
			});

			it('should update private unconfirmed links variable', function (done) {
				dapp.apply(transaction, dummyBlock, sender, function (err, cb) {
					should.not.exist(unconfirmedLinks[transaction.asset.dapp.link]);
					done();
				});
			});
		});

		describe('undo', function () {

			describe('with vaid parameters', function () {
				var dummyBlock = {
					id: '9314232245035524467',
					height: 1
				};

				it('should call the callback function', function (done) {
					dapp.undo(transaction, dummyBlock, sender, done);
				});
			});
		});

		describe('applyUnconfirmed', function () {

			describe('when unconfirmed names already exists', function () {

				beforeEach(function () {
					var dappNames = {};
					dappNames[transaction.asset.dapp.name] = true;
					Dapp.__set__('__private.unconfirmedNames', dappNames);
					Dapp.__set__('__private.unconfirmedLinks', {});
				});

				it('should call callback with error', function (done) {
					dapp.applyUnconfirmed(transaction, sender, function (err)  {
						err.should.equal('Application name already exists');
						done();
					});
				});
			});

			describe('when unconfirmed link already exists', function () {

				beforeEach(function () {
					var dappLinks = {};
					dappLinks[transaction.asset.dapp.link] = true;
					Dapp.__set__('__private.unconfirmedLinks', dappLinks);
					Dapp.__set__('__private.unconfirmedNames', {});
				});

				it('should call callback with error', function (done) {
					dapp.applyUnconfirmed(transaction, sender, function (err)  {
						err.should.equal('Application link already exists');
						done();
					});
				});
			});

			describe('when unconfirmed dapp does not exist', function () {

				var unconfirmedNames;
				var unconfirmedLinks;

				beforeEach(function () {
					var dappNames = {};
					var dappLinks = {};
					Dapp.__set__('__private.unconfirmedLinks', dappLinks);
					Dapp.__set__('__private.unconfirmedNames', dappNames);
					unconfirmedNames = Dapp.__get__('__private.unconfirmedNames');
					unconfirmedLinks = Dapp.__get__('__private.unconfirmedLinks');
				});

				it('should update unconfirmed name private variable', function (done) {
					dapp.applyUnconfirmed(transaction, sender, function () {
						unconfirmedNames[transaction.asset.dapp.name].should.equal(true);
						done();
					});
				});

				it('should update unconfirmed link private variable', function (done) {
					dapp.applyUnconfirmed(transaction, sender, function () {
						unconfirmedLinks[transaction.asset.dapp.link].should.equal(true);
						done();
					});
				});

				it('should call callback with error = undefined', function (done) {
					dapp.applyUnconfirmed(transaction, sender, function () {
						done();
					});
				});
			});
		});

		describe('undoUnconfirmed', function () {

			var unconfirmedNames;
			var unconfirmedLinks;

			beforeEach(function () {
				var dappNames = {};
				var dappLinks = {};
				Dapp.__set__('__private.unconfirmedLinks', dappLinks);
				Dapp.__set__('__private.unconfirmedNames', dappNames);
				unconfirmedNames = Dapp.__get__('__private.unconfirmedNames');
				unconfirmedLinks = Dapp.__get__('__private.unconfirmedLinks');
			});

			it('should delete unconfirmed name private variable', function (done) {
				dapp.undoUnconfirmed(transaction, sender, function () {
					should.not.exist(unconfirmedNames[transaction.asset.dapp.name]);
					done();
				});
			});

			it('should delete unconfirmed link private variable', function (done) {
				dapp.undoUnconfirmed(transaction, sender, function () {
					should.not.exist(unconfirmedLinks[transaction.asset.dapp.link]);
					done();
				});
			});

			it('should call callback with error = undefined', function (done) {
				dapp.undoUnconfirmed(transaction, sender, function () {
					done();
				});
			});
		});

		describe('objectNormalize', function () {

			describe('using undefined properties in the dapp asset', function () {

				var invalidProperties = {
					dummyUndefinedProperty: undefined,
					dummpyNullProperty: null
				};

				beforeEach(function () {
					transaction.asset.dapp = _.assign(transaction.asset.dapp, invalidProperties);
				});

				it('should remove undefined properties', function () {
					transaction = dapp.objectNormalize(transaction);
					transaction.should.not.have.property('dummyUndefinedProperty');
				});

				it('should remove null properties', function () {
					transaction = dapp.objectNormalize(transaction);
					transaction.should.not.have.property('dummpyNullProperty');
				});
			});

			describe('schema properties', function () {

				var library;
				var schemaSpy;

				beforeEach(function () {
					library = Dapp.__get__('library');
					schemaSpy = sinonSandbox.spy(library.schema, 'validate');
				});

				afterEach(function () {
					schemaSpy.restore();
				});

				it('should use the correct format to validate against', function () {
					dapp.objectNormalize(transaction);
					schemaSpy.calledOnce.should.equal(true);
					schemaSpy.calledWithExactly(transaction.asset.dapp, Dapp.prototype.schema).should.equal(true);
				});
			});

			describe('dynamic schema tests', function () {

				describe('category', function () {

					var invalidTypes = _.difference(typeRepresentatives.allTypes,
						typeRepresentatives.positiveIntegers,
						typeRepresentatives.negativeIntegers,
						typeRepresentatives.others
					);

					var otherTypes = typeRepresentatives.others;

					var invalidCategoriesNumber = [-1, -2, 0.1, 9, 10];
					var validCategories = [0, 1, 2, 3, 4, 5, 6, 7, 8];

					invalidTypes.forEach(function (type) {

						it('should throw error for: ' + type.description, function () {
							transaction.asset.dapp.category = type.input;
							dapp.objectNormalize.bind(null, transaction).should.throw('Failed to validate dapp schema: Expected type integer but found type ' + type.expectation);
						});
					});

					otherTypes.forEach(function (type) {
						it('should throw error for: ' + type.description, function () {
							transaction.asset.dapp.category = type.input;
							dapp.objectNormalize.bind(null, transaction).should.throw();
						});
					});

					invalidCategoriesNumber.forEach(function (input) {

						it('should throw error for value: ' + input, function () {
							transaction.asset.dapp.category = input;
							dapp.objectNormalize.bind(null, transaction).should.throw();
						});
					});

					validCategories.forEach(function (input) {

						it('should not throw error for valid value: ' + input, function () {
							transaction.asset.dapp.category = input;
							dapp.objectNormalize(transaction);
						});
					});
				});

				describe('name', function () {

					var invalidTypes = _.difference(typeRepresentatives.allTypes,
						typeRepresentatives.strings,
						typeRepresentatives.others
					);

					var otherTypes = typeRepresentatives.others;

					var invalidNames = ['', _.fill(new Array(33), 'a'), _.fill(new Array(34), 'b')];
					var validNames = _.fill(new Array(5), 'a').map(function () {
						return randomUtil.applicationName();
					});

					invalidTypes.forEach(function (type) {

						it('should throw error for: ' + type.description, function () {
							transaction.asset.dapp.name = type.input;
							dapp.objectNormalize.bind(null, transaction).should.throw('Failed to validate dapp schema: Expected type string but found type ' + type.expectation);
						});
					});

					otherTypes.forEach(function (type) {
						it('should throw error for: ' + type.description, function () {
							transaction.asset.dapp.name = type.input;
							dapp.objectNormalize.bind(null, transaction).should.throw();
						});
					});

					invalidNames.forEach(function (input) {

						it('should throw error for value: ' + input, function () {
							transaction.asset.dapp.name = input;
							dapp.objectNormalize.bind(null, transaction).should.throw();
						});
					});

					validNames.forEach(function (input) {

						it('should not throw error for value: ' + input, function () {
							transaction.asset.dapp.name = input;
							dapp.objectNormalize.bind(null, transaction).should.not.throw();
						});
					});
				});

				describe('description', function () {

					var invalidTypes = _.difference(typeRepresentatives.allTypes,
						typeRepresentatives.strings,
						typeRepresentatives.others
					);

					var invalidDescriptions = [_.fill(new Array(161), 'a'), _.fill(new Array(162), 'b')];
					var validDescriptions = _.fill(new Array(33), 'a').map(function () {
						return randomstring.generate(Math.random() * 160);
					});

					invalidTypes.forEach(function (type) {

						it('should throw error for: ' + type.description, function () {
							transaction.asset.dapp.description = type.input;
							dapp.objectNormalize.bind(null, transaction).should.throw('Failed to validate dapp schema: Expected type string but found type ' + type.expectation);
						});
					});

					invalidDescriptions.forEach(function (input) {

						it('should throw error for value: ' + input, function () {
							transaction.asset.dapp.description = input;
							dapp.objectNormalize.bind(null, transaction).should.throw();
						});
					});

					validDescriptions.forEach(function (input) {

						it('should not throw error for value: ' + input, function () {
							transaction.asset.dapp.description = input;
							dapp.objectNormalize.bind(null, transaction).should.not.throw();
						});
					});
				});

				describe('tags', function () {

					var invalidTypes = _.difference(typeRepresentatives.allTypes,
						typeRepresentatives.strings,
						typeRepresentatives.others
					);

					var invalidTags = [_.fill(new Array(161), 'a'), _.fill(new Array(81), 'b').join(',')];

					var validTags = [_.fill(new Array(_.toInteger(Math.random() * 80)), randomstring.generate(1)).join(','), 'adventure, fantasy'];

					invalidTypes.forEach(function (type) {

						it('should throw error for: ' + type.description, function () {
							transaction.asset.dapp.tags = type.input;
							dapp.objectNormalize.bind(null, transaction).should.throw('Failed to validate dapp schema: Expected type string but found type ' + type.expectation);
						});
					});

					invalidTags.forEach(function (input) {

						it('should throw error for value: ' + input, function () {
							transaction.asset.dapp.tags = input;
							dapp.objectNormalize.bind(null, transaction).should.throw();
						});
					});

					validTags.forEach(function (input) {

						it('should not throw error for value: ' + input, function () {
							transaction.asset.dapp.tags = input;
							dapp.objectNormalize.bind(null, transaction).should.not.throw();
						});
					});
				});

				describe('type', function () {

					var invalidTypes = _.difference(typeRepresentatives.allTypes,
						typeRepresentatives.positiveIntegers,
						typeRepresentatives.negativeIntegers,
						typeRepresentatives.others
					);

					var otherTypes = typeRepresentatives.others;

					var invalidTypesValues = [-0, -1, -2].concat(typeRepresentatives.negativeIntegers);

					// No max limit set on type. Type verification is partially handled here
					// and the rest is handled in verify function.
					// TODO: Do stronger schema checks
					var validTypes = [1, 2, 4, 11].concat(_.map(typeRepresentatives.positiveIntegers, 'input'));
					invalidTypes.forEach(function (type) {

						it('should throw error for: ' + type.description, function () {
							transaction.asset.dapp.type = type.input;
							dapp.objectNormalize.bind(null, transaction).should.throw('Failed to validate dapp schema: Expected type integer but found type ' + type.expectation);
						});
					});

					otherTypes.forEach(function (type) {
						it('should throw error for: ' + type.description, function () {
							transaction.asset.dapp.type = type.input;
							dapp.objectNormalize.bind(null, transaction).should.throw();
						});
					});

					invalidTypes.forEach(function (input) {

						it('should throw error for value: ' + input, function () {
							transaction.asset.dapp.type = input;
							dapp.objectNormalize.bind(null, transaction).should.throw();
						});
					});

					validTypes.forEach(function (input) {

						it('should not throw error for value: ' + input, function () {
							transaction.asset.dapp.type = input;
							dapp.objectNormalize.bind(null, transaction).should.not.throw();
						});
					});
				});

				describe('link', function () {

					var invalidTypes = _.difference(typeRepresentatives.allTypes,
						typeRepresentatives.strings,
						typeRepresentatives.others
					);

					// TODO: Schema checks only check whether property is a string or not,
					// and not whether value is actually a link. We need to handle it here.
					var invalidLinks = [_.fill(new Array(2002), 'a'), _.fill(new Array(2001), 'a')];
					var validLinks = _.fill(new Array(5), '').map(function () {
						return randomUtil.applicationName();
					});

					invalidTypes.forEach(function (type) {

						it('should throw error for: ' + type.description, function () {
							transaction.asset.dapp.link = type.input;
							dapp.objectNormalize.bind(null, transaction).should.throw('Failed to validate dapp schema: Expected type string but found type ' + type.expectation);
						});
					});

					invalidLinks.forEach(function (input) {

						it('should throw error for value: ' + input, function () {
							transaction.asset.dapp.link = input;
							dapp.objectNormalize.bind(null, transaction).should.throw();
						});
					});

					validLinks.forEach(function (input) {

						it('should not throw error for value: ' + input, function () {
							transaction.asset.dapp.link = input;
							dapp.objectNormalize.bind(null, transaction).should.not.throw();
						});
					});
				});

				describe('icon', function () {

					var invalidTypes = _.difference(typeRepresentatives.allTypes,
						typeRepresentatives.strings,
						typeRepresentatives.others
					);

					// TODO: Schema checks only check whether property is a string or not,
					// and not whether value is actually a link. We need to handle it here.
					var invalidIcons = [_.fill(new Array(2002), 'a'), _.fill(new Array(2001), 'a')];
					var validIcons = _.fill(new Array(5), '').map(function () {
						return randomUtil.applicationName();
					});

					invalidTypes.forEach(function (type) {

						it('should throw error for: ' + type.description, function () {
							transaction.asset.dapp.icon = type.input;
							dapp.objectNormalize.bind(null, transaction).should.throw('Failed to validate dapp schema: Expected type string but found type ' + type.expectation);
						});
					});

					invalidIcons.forEach(function (input) {

						it('should throw error for value: ' + input, function () {
							transaction.asset.dapp.icon = input;
							dapp.objectNormalize.bind(null, transaction).should.throw();
						});
					});

					validIcons.forEach(function (input) {

						it('should not throw error for value: ' + input, function () {
							transaction.asset.dapp.icon = input;
							dapp.objectNormalize.bind(null, transaction).should.not.throw();
						});
					});
				});
			});

			it('should return transaction when asset is valid', function () {
				dapp.objectNormalize(transaction).should.eql(transaction);
			});
		});

		describe('dbRead', function () {

			describe('when rawTransaction.dapp_name does not exist', function () {

				beforeEach(function () {
					delete rawTransaction.dapp_name;
				});

				it('should return null', function () {
					should.not.exist(dapp.dbRead(rawTransaction));
				});
			});

			describe('when rawTransaction.dapp_name exists', function () {

				it('should return result containing dapp property', function () {
					dapp.dbRead(rawTransaction).should.have.property('dapp');
				});

				it('should return result containing dapp property', function () {
					dapp.dbRead(rawTransaction).should.have.nested.property('dapp.category').to.equal(rawTransaction.dapp_category);
				});

				it('should return result containing dapp property', function () {
					dapp.dbRead(rawTransaction).should.have.nested.property('dapp.description').to.eql(rawTransaction.dapp_description);
				});

				it('should return result containing dapp property', function () {
					dapp.dbRead(rawTransaction).should.have.nested.property('dapp.icon').to.eql(rawTransaction.dapp_icon);
				});

				it('should return result containing dapp property', function () {
					dapp.dbRead(rawTransaction).should.have.nested.property('dapp.link').to.eql(rawTransaction.dapp_link);
				});

				it('should return result containing dapp property', function () {
					dapp.dbRead(rawTransaction).should.have.nested.property('dapp.name').to.eql(rawTransaction.dapp_name);
				});

				it('should return result containing dapp property', function () {
					dapp.dbRead(rawTransaction).should.have.nested.property('dapp.tags').to.eql(rawTransaction.dapp_tags);
				});

				it('should return result containing dapp property', function () {
					dapp.dbRead(rawTransaction).should.have.nested.property('dapp.type').to.eql(rawTransaction.dapp_type);
				});
			});
		});

		describe('ready', function () {

			it('should return true for single signature transaction', function () {
				dapp.ready(transaction, sender).should.equal(true);
			});

			it('should return false for multi signature transaction with less signatures', function () {
				sender.multisignatures = [validKeypair.publicKey.toString('hex')];

				dapp.ready(transaction, sender).should.equal(false);
			});

			it('should return true for multi signature transaction with alteast min signatures', function () {
				sender.multisignatures = [validKeypair.publicKey.toString('hex')];
				sender.multimin = 1;

				delete transaction.signature;
				// Not really correct signature, but we are not testing that over here
				transaction.signature = crypto.randomBytes(64).toString('hex');;
				transaction.signatures = [crypto.randomBytes(64).toString('hex')];

				dapp.ready(transaction, sender).should.equal(true);
			});
		});
	});
});
