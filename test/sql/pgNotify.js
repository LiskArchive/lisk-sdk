'use strict';

var pgNotify = {
	interruptConnection: 'SELECT pg_terminate_backend(${pid});',

	triggerNotify: 'SELECT pg_notify(${channel}, json_build_object(\'round\', CEIL((SELECT height+1 FROM blocks ORDER BY height DESC LIMIT 1) / 101::float)::int, \'list\', getDelegatesList())::text);',

	triggerNotifyWithMessage: 'SELECT pg_notify(${channel}, ${message});',

	getDelegatesList: 'SELECT getDelegatesList() AS list;',

	getRound: 'SELECT CEIL((SELECT height+1 FROM blocks ORDER BY height DESC LIMIT 1) / 101::float)::int AS round;'
};

module.exports = pgNotify;
