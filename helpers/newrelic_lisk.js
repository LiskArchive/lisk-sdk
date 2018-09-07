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

const newrelic = require('newrelic');

function instrumentError(error) {
	console.error(error);
	process.exit(1);
}

function instrumentSwaggerNodeRunnerFramework(shim, swaggerNodeRunner) {
	let runner = null;
	let middleware = null;

	shim.setFramework(shim.EXPRESS);

	function swaggerNodeRunnerMiddleware(req, res, next) {
		const operation = runner.getOperation(req);

		shim.setTransactionUri(operation.pathObject.path);

		middleware.apply(runner, [req, res, next]);
	}

	function wrappedCreateCb(errors, _runner) {
		if (shim.isWrapped(this)) {
			return this;
		}
		const actualCb = this;

		if (!errors) {
			runner = _runner;
			middleware = _runner.expressMiddleware().middleware();

			shim.wrap(_runner, ['expressMiddleware'], {
				// eslint-disable-next-line no-unused-vars
				wrapper(shim, fn, name) {
					return function() {
						return {
							register(app) {
								app.use(swaggerNodeRunnerMiddleware);
							},
							middleware() {
								return swaggerNodeRunnerMiddleware;
							},
						};
					};
				},
			});
		}

		return actualCb.apply(this, [errors, _runner]);
	}

	// eslint-disable-next-line no-unused-vars
	function wrappedRunnerCreate(shim, fn, fnName) {
		if (shim.isWrapped(fn)) {
			return fn;
		}

		return function(swaggerConfig, cb) {
			fn.apply(cb, [swaggerConfig, wrappedCreateCb.bind(cb)]);
		};
	}

	shim.wrap(swaggerNodeRunner, ['create'], {
		callback: shim.LAST,
		wrapper: wrappedRunnerCreate,
	});
}

// eslint-disable-next-line no-unused-vars
function instrumentPgPromise(shim, pgPromise, moduleName) {
	shim.setDatastore(shim.POSTGRES);

	const proto = pgPromise.prototype;
	shim.recordOperation(proto, [
		'ParameterizedQuery',
		'PreparedStatement',
		'QueryFile',
	]);
}

function instrumentModulesWithCallback(shim, module, moduleName) {
	const moduleIdentifier = moduleName.split('.')[0];

	shim.wrap(
		module.prototype,
		modulesInstrument[moduleName].callbackMethods,
		(shim, fn, fnName) =>
			function() {
				const args = shim.argsToArray(...arguments);
				const segment = shim.createSegment(
					`${moduleIdentifier}.${fnName}`,
					null,
					null
				);
				shim.bindCallbackSegment(args, shim.LAST, segment);
				fn.apply(this, args);
			}
	);
}

// eslint-disable-next-line no-unused-vars
function instrumentJobQueue(shim, jobQueue, moduleName) {
	// eslint-disable-next-line no-unused-vars
	shim.wrap(jobQueue, ['register'], (shim, originalRegister, fnName) => {
		if (shim.isWrapped(originalRegister)) {
			return originalRegister;
		}

		return function wrappedRegister(name, originalJob, time) {
			function wrappedJob(cb) {
				newrelic.startBackgroundTransaction(name, 'jobQueue', () => {
					const transaction = newrelic.getTransaction();
					originalJob.call(this, () => {
						transaction.end();
						cb.call(this);
					});
				});
			}

			originalRegister.call(this, name, wrappedJob, time);
		};
	});
}

const modulesInstrument = {
	'./modules/node.js': {
		callbackMethods: ['shared.getStatus', 'shared.getConstants'],
	},
};

Object.keys(modulesInstrument).forEach(modulePath => {
	newrelic.instrument({
		moduleName: modulePath,
		onRequire: instrumentModulesWithCallback,
		onError: instrumentError,
	});
});

newrelic.instrument({
	moduleName: '../helpers/jobs_queue.js',
	onRequire: instrumentJobQueue,
	onError: instrumentError,
});

newrelic.instrumentDatastore({
	moduleName: 'pg-promise',
	onRequire: instrumentPgPromise,
	onError: instrumentError,
});

newrelic.instrumentWebframework({
	moduleName: 'swagger-node-runner',
	onRequire: instrumentSwaggerNodeRunnerFramework,
	onError: instrumentError,
});
