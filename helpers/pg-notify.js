'use strict';

var Promise = require('bluebird');

// Init global module variables
var db, bus, logger;
// Global connection for permanent event listeners
var connection;
// Map channels to bus.message events
var channels = {
	'round-closed': 'finishRound',
	'round-reopened': 'finishRound'
};

function isTestEnv () {
	return true ? process.env['NODE_ENV'] === 'TEST' : false;
}

function onNotification (data) {
	logger.debug('pg-notify: Notification received', {channel: data.channel, data: data.payload});

	if (!channels[data.channel]) {
		// Channel is not supported - should never happen
		logger.error('pg-notify: Invalid channel', data.channel);
		return;
	}

	// Process round-releated things
	if (data.channel === 'round-closed') {
		data.payload = parseInt(data.payload);
		logger.info('pg-notify: Round closed', data.payload);
		// Set new round
		data.payload += 1;
	} else if (data.channel === 'round-reopened') {
		data.payload = parseInt(data.payload);
		logger.warn('pg-notify: Round reopened', data.payload);
	}

	// Broadcast notify via events
	bus.message(channels[data.channel], data.payload);
}

function setListeners (client) {
	client.on('notification', onNotification);

	// Generate list of queries for listen to every supported channels
	function listenQueries (t) {
		var queries = [];
		Object.keys(channels).forEach(function (channel) {
  			queries.push(t.none('LISTEN $1~', channel));
		});
		return t.batch(queries);
	}

	connection.task(listenQueries)
		.catch(function (err) {
			logger.error(err);
		});
}

function removeListeners (client) {
	if (connection) {
		// Generate list of queries for unlisten to every supported channels
		function unlistenQueries (t) {
			var queries = [];
			Object.keys(channels).forEach(function (channel) {
	  			queries.push(t.none('UNLISTEN $1~', channel));
			});
			return t.batch(queries);
		}

		connection.task(unlistenQueries)
			.catch(function (err) {
				logger.error(err);
			});
	}
	client.removeListener('notification', onNotification);
}

function onConnectionLost (err, e) {
	logger.error('pg-notify: Connection lost', err);
	// Prevent use of the connection
	connection = null;
	removeListeners(e.client);
	// Try to re-establish connection 10 times, every 5 seconds
	reconnect(5000, 10)
		.then(function (obj) {
			logger.info('pg-notify: Reconnected successfully');
		})
		.catch(function () {
			// Failed after 10 attempts
			logger.error('pg-notify: Failed to reconnect - connection lost');
			// Kill node if we are not in test environment
			if (!isTestEnv) {
				process.exit();
			}
		});
}

function reconnect (delay, maxAttempts) {
	delay = delay > 0 ? delay : 0;
	maxAttempts = maxAttempts > 0 ? maxAttempts : 1;
	return new Promise(function (resolve, reject) {
		setTimeout(function () {
			db.connect({direct: true, onLost: onConnectionLost})
				.then(function (obj) {
					// Global connection is now available
					connection = obj;
					setListeners(obj.client);
					resolve(obj);
				})
				.catch(function (err) {
					logger.error('pg-notify: Error connecting', err);
					if (--maxAttempts) {
						reconnect(delay, maxAttempts)
							.then(resolve)
							.catch(reject);
					} else {
						reject(err);
					}
				});
		}, delay);
	});
}

module.exports.init = function (_db, _bus, _logger, cb) {
	db = _db;
	bus = _bus;
	logger = _logger;

	reconnect ()
		.then(function (obj) {
			logger.info('pg-notify: Initial connection estabilished');
			return setImmediate(cb);
		})
		.catch(function (err) {
			logger.error('pg-notify: Initial connection failed', err);
			// Error is passed to callback here, so node will not start in that case
			return setImmediate(cb, err);
		});
};
