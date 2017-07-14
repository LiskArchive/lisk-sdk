'use strict';

var pgNotify = {
	interruptConnection: 'SELECT pg_terminate_backend(${pid});',
	triggerNotify: 'SELECT pg_notify(${channel}, json_build_object(\'round\', CEIL((SELECT height FROM blocks ORDER BY height DESC LIMIT 1) / 101::float)::int, \'list\', generateDelegatesList(CEIL((SELECT height FROM blocks ORDER BY height DESC LIMIT 1) / 101::float)::int, ARRAY(SELECT ENCODE(pk, \'hex\') AS pk FROM delegates ORDER BY rank ASC LIMIT 101)))::text);',
	triggerNotifyWithMessage: 'SELECT pg_notify(${channel}, ${message});'
};

module.exports = pgNotify;
