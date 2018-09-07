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

// eslint-disable-next-line import/order
const newrelic = require('newrelic');

const fs = require('fs');
const path = require('path');

const rootPath = process.cwd();

const controllerMethodExtractor = (shim, controller) =>
	Object.getOwnPropertyNames(controller).filter(name =>
		shim.isFunction(controller[name])
	);

// callBackMethods array only support one level of nesting
const modulesToInstrument = {
	'./modules/node.js': {
		identifier: 'modules.node',
		callbackMethods: ['shared.getStatus', 'shared.getConstants'],
	},
	[`${rootPath}/api/controllers/node.js`]: {
		identifier: 'api.controllers.node',
		methodExtractor: controllerMethodExtractor,
	},
};

const controllerFolder = '/api/controllers/';
fs.readdirSync(rootPath + controllerFolder).forEach(file => {
	if (path.basename(file) !== 'index.js') {
		modulesToInstrument[`${rootPath}${controllerFolder}${file}`] = {
			identifier: `api.controllers.${path
				.basename(file)
				.split('.')
				.slice(0, -1)
				.join('.')}`,
			methodExtractor: controllerMethodExtractor,
		};
	}
});

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

		if (operation) {
			shim.setTransactionUri(operation.pathObject.path);
		}

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
	const moduleIdentifier = modulesToInstrument[moduleName].identifier;
	let methods = null;

	if (modulesToInstrument[moduleName].methodExtractor) {
		methods = modulesToInstrument[moduleName].methodExtractor(shim, module);
	} else {
		methods = modulesToInstrument[moduleName].callbackMethods;
	}

	methods.forEach(method => {
		const methods = method.split('.');
		let object;
		let methodToWrap;

		if (methods.length > 2) {
			throw new Error(
				'callBackMethods array only support one level of nesting'
			);
		}

		if (methods.length === 2) {
			object = module.prototype[methods[0]];
			methodToWrap = methods[1];
		} else {
			object = module;
			methodToWrap = method;
		}

		shim.wrap(
			object,
			[methodToWrap],
			// eslint-disable-next-line no-unused-vars
			(shim, fn, fnName) =>
				function() {
					const args = shim.argsToArray(...arguments);
					const segment = shim.createSegment(`${moduleIdentifier}.${method}`);
					shim.bindCallbackSegment(args, shim.LAST, segment);
					fn.apply(this, args);
				}
		);
	});
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

Object.keys(modulesToInstrument).forEach(modulePath => {
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
