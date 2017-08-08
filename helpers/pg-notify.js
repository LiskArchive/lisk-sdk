'use strict';

var Promise = require('bluebird');

// Init global module variables
var db, bus, logger;
// Global connection for permanent event listeners
var connection;
// Map channels to bus.message events
var channels = {
	'round-closed': 'roundChanged',
	'round-reopened': 'roundChanged'
};

function onNotification (data) {
	logger.debug('pg-notify: Notification received', {channel: data.channel, data: data.payload});

	if (!channels[data.channel]) {
		// Channel is invalid - should never happen
		logger.error('pg-notify: Invalid channel', data.channel);
		return;
	}

	// Process round-related things
	if (data.channel === 'round-closed') {
		logger.info('pg-notify: Round closed');
		try {
			data.payload = JSON.parse(data.payload);
		} catch (e) {
			logger.error('pg-notify: Unable to parse JSON', {err: e, data: data});
			return;
		}
	} else if (data.channel === 'round-reopened') {
		logger.warn('pg-notify: Round reopened');
		try {
			data.payload = JSON.parse(data.payload);
		} catch (e) {
			logger.error('pg-notify: Unable to parse JSON', {err: e, data: data});
			return;
		}
	} else {
		// Channel is not supported - should never happen
		logger.error('pg-notify: Channel not supported', data.channel);
		return;
	}

	// Broadcast notify via events
	bus.message(channels[data.channel], data.payload);
}

// Generate list of queries for listen to every supported channels
function listenQueries (t) {
	var queries = [];
	Object.keys(channels).forEach(function (channel) {
		queries.push(t.none('LISTEN $1~', channel));
	});
	return t.batch(queries);
}

function setListeners (client, cb) {
	client.on('notification', onNotification);

	connection.task(listenQueries)
		.then(function () {
			return setImmediate(cb);
		})
		.catch(function (err) {
			logger.error('pg-notify: Failed to execute LISTEN queries', err);
			return setImmediate(cb, err);
		});
}

// Generate list of unlisten queries for every supported channel
function unlistenQueries (t) {
	var queries = [];
	Object.keys(channels).forEach(function (channel) {
		queries.push(t.none('UNLISTEN $1~', channel));
	});
	return t.batch(queries);
}

function removeListeners (client, cb) {
	client.removeListener('notification', onNotification);

	if (connection) {
		connection.task(unlistenQueries)
			.then(function () {
				return setImmediate(cb);
			})
			.catch(function (err) {
				logger.error('pg-notify: Failed to execute UNLISTEN queries', err);
				return setImmediate(cb, err);
			});
	} else {
		return setImmediate(cb);
	}
}

function onConnectionLost (err, e) {
	logger.error('pg-notify: Connection lost', err);
	// Prevent use of the connection
	connection = null;
	// We don't care about error here, so passing empty function as callback
	removeListeners(e.client, function () {});
	// Try to re-establish connection 10 times, every 5 seconds
	reconnect(5000, 10)
		.then(function (obj) {
			logger.info('pg-notify: Reconnected successfully');
		})
		.catch(function () {
			// Failed after 10 attempts
			logger.error('pg-notify: Failed to reconnect - connection lost');
			process.exit();
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
					setListeners(obj.client, function (err) {
						if (err) {
							reject(err);
						} else {
							resolve(obj);
						}
					});
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
