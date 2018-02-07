require('angular');

angular.module('liskApp').service('dappsService', function () {

    var dapp = {
        searchForDapp: '',
        searchForDappGlobal: ''
    }

    return dapp;

});
