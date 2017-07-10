'use strict';

var pgNotify = {
	interruptConnection: 'SELECT pg_terminate_backend(${pid});'
};

module.exports = pgNotify;
