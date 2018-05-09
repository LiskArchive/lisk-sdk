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

var queryParser = require('express-query-int');
var checkIpInList = require('./check_ip_in_list');
var apiCodes = require('./api_codes');

/**
 * A utility helper module to provide different express middleware to be used in http request cycle
 *
 * @module
 * @see Parent: {@link helpers}
 * @requires extend
 * @requires lodash
 * @requires helpers/api_codes
 * @requires helpers/check_ip_in_list
 * @property {Object} middleware
 * @todo Add description for the module and the properties
 */

/**
 * Middleware functions connection logging, api access rules and others.
 * and setup router.
 *
 * @namespace middleware
 * @see Parent: {@link module:helpers/http_api}
 * @memberof module:helpers/http_api
 */
var middleware = {
	/**
	 * Logs all api errors.
	 *
	 * @memberof module:helpers/http_api.middleware
	 * @param {Logger} logger
	 * @param {Error} err
	 * @param {Object} req
	 * @param {Object} res
	 * @param {function} next
	 * @todo Add description for the params
	 * @todo Add @returns tag
	 */
	errorLogger(logger, err, req, res, next) {
		if (!err) {
			return next();
		}
		if (err.status === 400 && err.name === 'SyntaxError') {
			// Express JSON body-parser throws an error with status === 400 if the
			// payload cannot be parsed to valid JSON, in this case we want to send
			// a response with status code 400.
			res.status(400).send({
				message: 'Parse errors',
				errors: [
					{
						code: 'INVALID_REQUEST_PAYLOAD',
						name: 'payload',
						in: 'query',
						message: err.message,
					},
				],
			});
		} else {
			logger.error(`API error ${req.url}`, err.message);
			logger.trace(err);
			res
				.status(500)
				.send({ success: false, error: `API error: ${err.message}` });
		}
	},

	/**
	 * Logs api client connections.
	 *
	 * @memberof module:helpers/http_api.middleware
	 * @param {Logger} logger
	 * @param {Object} req
	 * @param {Object} res
	 * @param {function} next
	 * @todo Add description for the params
	 * @todo Add @returns tag
	 */
	logClientConnections(logger, req, res, next) {
		// Log client connections
		logger.log(`${req.method} ${req.url} from ${req.ip}`);

		return next();
	},

	/**
	 * Attachs header to response.
	 *
	 * @memberof module:helpers/http_api.middleware
	 * @param {string} headerKey
	 * @param {string} headerValue
	 * @param {Object} req
	 * @param {Object} res
	 * @param {function} next
	 * @todo Add description for the params
	 * @todo Add @returns tag
	 */
	attachResponseHeader(headerKey, headerValue, req, res, next) {
		res.setHeader(headerKey, headerValue);
		return next();
	},

	/**
	 * Applies rules of public / internal API described in config.json.
	 *
	 * @memberof module:helpers/http_api.middleware
	 * @param {Object} config
	 * @param {Object} req
	 * @param {Object} res
	 * @param {function} next
	 * @todo Add description for the params
	 * @todo Add @returns tag
	 */
	applyAPIAccessRules(config, req, res, next) {
		if (!config.api.enabled) {
			res
				.status(apiCodes.INTERNAL_SERVER_ERROR)
				.send({ success: false, error: 'API access disabled' });
		} else if (
			!config.api.access.public &&
			!checkIpInList(config.api.access.whiteList, req.ip, false)
		) {
			res
				.status(apiCodes.FORBIDDEN)
				.send({ success: false, error: 'API access denied' });
		} else {
			next();
		}
	},

	queryParser() {
		const ignoredPramList = [
			'id',
			'name',
			'username',
			'blockId',
			'transactionId',
			'address',
			'recipientId',
			'senderId',
			'search',
		];

		return queryParser({
			parser(value, radix, name) {
				if (ignoredPramList.indexOf(name) >= 0) {
					return value;
				}

				// Ignore conditional fields for transactions list
				if (/^.+?:(blockId|recipientId|senderId)$/.test(name)) {
					return value;
				}

				if (
					isNaN(value) ||
					parseInt(value) != value ||
					isNaN(parseInt(value, radix))
				) {
					return value;
				}

				return parseInt(value);
			},
		});
	},
};

module.exports = {
	middleware,
};
