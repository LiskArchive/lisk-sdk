'use strict';

var DelegatesList = {
	generateDelegatesList: 'SELECT generateDelegatesList AS delegates FROM generateDelegatesList(${round}, ${delegates});',
	generateDelegatesListCast: 'SELECT generateDelegatesList AS delegates FROM generateDelegatesList(${round}, ${delegates}::text[]);',
};

module.exports = DelegatesList;
