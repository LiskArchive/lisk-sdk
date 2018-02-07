require('angular');

angular.module('liskApp').factory('openDappModal', function (btfModal) {
    return btfModal({
        controller: 'openDappModalController',
        templateUrl: '/partials/modals/openDappModal.html'
    });
});
