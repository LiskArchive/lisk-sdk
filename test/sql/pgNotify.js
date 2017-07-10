'use strict';

var pgNotify = {
	interruptConnection: 'SELECT pg_terminate_backend(${pid});',
	triggerNotify: 'SELECT pg_notify(${channel}, ${message});'
};

module.exports = pgNotify;
