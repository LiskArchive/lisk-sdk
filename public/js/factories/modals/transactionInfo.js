require('angular');

angular.module('liskApp').factory('transactionInfo', function (btfModal) {
    return btfModal({
        controller: 'transactionInfoController',
        templateUrl: '/partials/modals/transactionInfo.html'
    });
});
