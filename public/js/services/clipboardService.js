require('angular');

angular.module('liskApp').service('clipboardService', function ($rootScope, gettextCatalog) {

    $rootScope.clipboardSuccess = function (e) {
        Materialize.toast(gettextCatalog.getString('Copied!'), 1500, 'green white-text');
    };

    $rootScope.clipboardCommand = function (e) {
        Materialize.toast(gettextCatalog.getString('Press &#8984;+c to copy'), 1500, 'blue white-text');
    };

    $rootScope.clipboardError = function (e) {
        Materialize.toast(gettextCatalog.getString('Copy failed!'), 1500, 'red white-text');
    };

    return function () {
    };

});
