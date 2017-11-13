'use strict';

var DelegatesList = {
	generateDelegatesList: 'SELECT generate_delegates_list AS delegates FROM generate_delegates_list(${round}, ${delegates});',

	generateDelegatesListCast: 'SELECT generate_delegates_list AS delegates FROM generate_delegates_list(${round}, ${delegates}::text[]);',

	getDelegatesList: 'SELECT get_delegates_list() AS list;',

	getActiveDelegates: 'SELECT ARRAY(SELECT ENCODE(public_key, \'hex\') AS pk FROM delegates ORDER BY rank ASC LIMIT 101) AS delegates',

	getRound: 'SELECT CEIL((SELECT height+1 FROM blocks ORDER BY height DESC LIMIT 1) / 101::float)::int AS round;'
};

module.exports = DelegatesList;
