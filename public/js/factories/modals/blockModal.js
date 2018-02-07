require('angular');

angular.module('liskApp').factory('blockModal', function (btfModal) {
    return btfModal({
        controller: 'blockModalController',
        templateUrl: '/partials/modals/blockModal.html'
    });
});
