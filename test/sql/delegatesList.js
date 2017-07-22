'use strict';

var DelegatesList = {
	generateDelegatesList: 'SELECT generateDelegatesList AS delegates FROM generateDelegatesList(${round}, ${delegates});',

	generateDelegatesListCast: 'SELECT generateDelegatesList AS delegates FROM generateDelegatesList(${round}, ${delegates}::text[]);',

	getDelegatesList: 'SELECT getDelegatesList() AS list;',

	getActiveDelegates: 'SELECT ARRAY(SELECT ENCODE(pk, \'hex\') AS pk FROM delegates ORDER BY rank ASC LIMIT 101) AS delegates',

	getRound: 'SELECT CEIL((SELECT height+1 FROM blocks ORDER BY height DESC LIMIT 1) / 101::float)::int AS round;'
};

module.exports = DelegatesList;
