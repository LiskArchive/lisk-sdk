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

const JSONHistory = require('../../../helpers/json_history.js');

const historyTitle = 'config history';
let history;
let loggerStub;

describe('helpers/JSONHistory', () => {
	beforeEach(() => {
		loggerStub = {
			info: sinonSandbox.stub(),
		};
		history = new JSONHistory(historyTitle, loggerStub);
		return history;
	});

	afterEach(() => {
		return sinonSandbox.restore();
	});

	describe('constructor function', () => {
		it('should be a constructor function', () => {
			return expect(JSONHistory).to.be.a('function');
		});
		it('should accept two arguments', () => {
			return expect(JSONHistory.length).to.be.eql(2);
		});
		it('should return a history object', () => {
			return expect(history).to.be.an('object');
		});
	});

	describe('history object', () => {
		it('should assign title argument', () => {
			return expect(history.title).to.be.eql(historyTitle);
		});
		it('should assign logger argument', () => {
			return expect(history.logger).to.be.eql(loggerStub);
		});
		it('should expose a function version() accepting 2 arguments', () => {
			expect(history.version).to.be.a('function');
			return expect(history.version.length).to.be.eql(2);
		});
		it('should expose a function migrate() accepting 4 arguments', () => {
			expect(history.migrate).to.be.a('function');
			return expect(history.migrate.length).to.be.eql(4);
		});
		it('should expose a function getVersions() accepting 0 arguments', () => {
			expect(history.getVersions).to.be.a('function');
			return expect(history.getVersions.length).to.be.eql(0);
		});

		describe('history.version()', () => {
			it('should be ok to call without callback', () => {
				return expect(() => history.version('1.1.0')).to.not.throw();
			});
			it('should throw error if called without version name', () => {
				return expect(() => history.version()).to.throw(
					'Invalid version specified.'
				);
			});
			it('should throw error if version is not valid semver', () => {
				return expect(() => history.version('nazar')).to.throw(
					'Invalid version or version range specified.'
				);
			});
			it('should accept version with support wildcard version (0.9.x)', () => {
				return expect(() => history.version('0.9.x')).to.not.throw();
			});
			it('should accept version with support of range (>=0.9.0 <0.10.0)', () => {
				return expect(() => history.version('>=0.9.0 <0.10.0')).to.not.throw();
			});
			it('should throw error if called with duplicate version', () => {
				history.version('1.1.0');
				return expect(() => history.version('1.1.0')).to.throw(
					'Version 1.1.0 already declared.'
				);
			});
			it('should add version to internal collection of versions', done => {
				validVersionsExpectations(history, done);
			});
			it('should call the callback if given', () => {
				const spy = sinonSandbox.spy();
				history.version('1.1.0', spy);
				return expect(spy).to.be.calledOnce;
			});
			it('should pass "version" object to the callback as first argument', () => {
				const spy = sinonSandbox.spy();
				history.version('1.1.0', spy);
				const versionObject = spy.firstCall.args[0];
				expect(versionObject).to.be.an('object');
				expect(versionObject.change).to.be.a('function');
				return expect(versionObject.version).to.be.eql('1.1.0');
			});
		});

		describe('history.getVersions()', () => {
			it('should return list of declared versions', done => {
				validVersionsExpectations(history, done);
			});
		});

		describe('history.getChangeSet()', () => {
			it('should return list of declared changes', done => {
				validChangeSetExpectations(history, done);
			});
		});

		describe('history.migrate()', () => {
			beforeEach('prepare history to migrate', done => {
				history.version('1.0.0', version => {
					version.change('add 1', config => {
						config.v1 = '1';
						return config;
					});
				});

				history.version('2.0.0');

				history.version('3.0.0', version => {
					version.change('add 3', config => {
						config.v3 = '3';
						return config;
					});
				});

				history.version('4.0.0', version => {
					version.change('add 4', config => {
						config.v4 = '4';
						return config;
					});
				});

				done();
			});

			it('should throw error if called without json', () => {
				return expect(() => history.migrate()).to.throw(
					'Invalid json object to migrate.'
				);
			});
			it('should throw error if called without invalid json', () => {
				return expect(() => history.migrate('string')).to.throw(
					'Invalid json object to migrate.'
				);
			});
			it('should be ok if called with empty json', () => {
				return expect(() => history.migrate({}, () => {})).to.not.throw();
			});
			it('should throw error if called without invalid start version', () => {
				return expect(() => history.migrate({}, 'nazar', () => {})).to.throw(
					'Invalid start version specified to migrate.'
				);
			});
			it('should throw error if called without invalid end version', () => {
				return expect(() =>
					history.migrate({}, '1.0.0', 'nazar', () => {})
				).to.throw('Invalid end version specified to migrate.');
			});
			it('should throw error if called without callback', () => {
				return expect(() => history.migrate({}, '1.0.0', '2.0.0')).to.throw(
					'Invalid callback specified to migrate.'
				);
			});
			it('should be ok if called without start and end version', () => {
				return expect(() => history.migrate({}, () => {})).to.not.throw();
			});
			it('should be ok if called without end version', () => {
				return expect(() => history.migrate({}, () => {})).to.not.throw();
			});
			it('should provide any error as first argument of the callback', done => {
				history.version('5.0.0', version => {
					version.change('make an error here', (config, cb) => {
						cb('Error occurred during change.');
					});
				});

				history.migrate({}, error => {
					expect(error).to.be.eql('Error occurred during change.');
					done();
				});
			});
			it('should provide migrated data as second argument of the callback', done => {
				history.migrate({}, (error, data) => {
					expect(error).to.be.null;
					expect(data).to.be.eql({ v1: '1', v3: '3', v4: '4' });
					validMigrationExpectations(
						history,
						['1.0.0', '3.0.0', '4.0.0'],
						['2.0.0']
					);
					done();
				});
			});
			it('should migrate through all versions if not specified start and end version', done => {
				history.migrate({}, (error, data) => {
					expect(error).to.be.null;
					expect(data).to.be.eql({ v1: '1', v3: '3', v4: '4' });
					validMigrationExpectations(
						history,
						['1.0.0', '3.0.0', '4.0.0'],
						['2.0.0']
					);
					done();
				});
			});
			it('should migrate till end of versions if not specified end version', done => {
				history.migrate({}, '1.0.0', (error, data) => {
					expect(error).to.be.null;
					expect(data).to.be.eql({ v3: '3', v4: '4' });
					validMigrationExpectations(
						history,
						['1.0.0', '3.0.0', '4.0.0'],
						['2.0.0']
					);
					done();
				});
			});
			it('should migrate changes from start version skipping change for that version', done => {
				history.migrate({}, '2.0.0', (error, data) => {
					expect(error).to.be.null;
					expect(data).to.be.eql({ v3: '3', v4: '4' });
					validMigrationExpectations(history, ['2.0.0', '3.0.0', '4.0.0'], []);
					done();
				});
			});
			it('should throw error if start version is registered in history', () => {
				return expect(() => history.migrate({}, '0.0.0', () => {})).to.throw(
					'Can\'t find supported version to start migration from  version "0.0.0"'
				);
			});
			it('should migrate changes till end version if provided', done => {
				history.migrate({}, '1.0.0', '3.0.0', (error, data) => {
					expect(error).to.be.null;
					expect(data).to.be.eql({ v3: '3' });
					validMigrationExpectations(history, ['1.0.0', '3.0.0'], ['2.0.0']);
					done();
				});
			});
		});
	});

	describe('version object', () => {
		it('should have a property version assigned as current version', done => {
			history.version('1.1.0', version => {
				expect(version.version).to.be.eql('1.1.0');
				done();
			});
		});

		it('should expose a function change() accepting 2 arguments', done => {
			history.version('1.1.0', version => {
				expect(version.change).to.be.a('function');
				expect(version.change.length).to.be.eql(2);
				done();
			});
		});

		describe('version.change()', () => {
			it('should throw error if called without title', done => {
				history.version('1.1.0', version => {
					expect(() => version.change()).to.throw(
						'Title for the change is required.'
					);
					done();
				});
			});
			it('should throw error if called with empty string as title', done => {
				history.version('1.1.0', version => {
					expect(() => version.change()).to.throw(
						'Title for the change is required.'
					);
					done();
				});
			});
			it('should throw error if called without callback', done => {
				history.version('1.1.0', version => {
					expect(() => version.change('a dummy change')).to.throw(
						'Callback for the change is required.'
					);
					done();
				});
			});
			it('should throw error if called without callback without one argument', done => {
				history.version('1.1.0', version => {
					expect(() => version.change('a dummy change', () => {})).to.throw(
						'Callback for the change accepts up-to two arguments.'
					);
					done();
				});
			});

			it('should add change to internal collection of changes in right order', done => {
				validChangeSetExpectations(history, done);
			});
		});
	});
});

const validMigrationExpectations = (history, versions, skipped) => {
	expect(loggerStub.info).to.be.calledWith(
		`Applying migration of ${history.title} from ${versions[0]} to ${
			versions[versions.length - 1]
		}`
	);

	// First version will be skipped
	versions.splice(0);

	versions.forEach(v => {
		expect(loggerStub.info).to.be.calledWith(
			`\n\n- Applying changes for version "${v}"`
		);
	});
	skipped.forEach(v => {
		expect(loggerStub.info).to.be.calledWith(
			`\n\n- No changes for version "${v}"`
		);
	});
};

const validVersionsExpectations = (history, cb) => {
	history.version('1.1.0');
	history.version('1.2.0');
	expect(history.getVersions()).to.be.eql(['1.1.0', '1.2.0']);
	cb();
};

const validChangeSetExpectations = (history, cb) => {
	history.version('1.1.0', version => {
		version.change('dummy change 1', data => data);
		version.change('dummy change 2', data => data);
	});
	history.version('1.2.0', version => {
		version.change('dummy change 3', data => data);
		version.change('dummy change 4', data => data);
	});

	const changeSet = history.getChangeSet();

	expect(changeSet.length).to.be.eql(4);
	expect(changeSet.map(c => c.title)).to.be.eql([
		'dummy change 1',
		'dummy change 2',
		'dummy change 3',
		'dummy change 4',
	]);
	expect(changeSet.map(c => c.version)).to.be.eql([
		'1.1.0',
		'1.1.0',
		'1.2.0',
		'1.2.0',
	]);
	changeSet.map(c => expect(c.change).to.be.a('function'));
	cb();
};
