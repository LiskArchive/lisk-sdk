require('angular');

angular.module('liskApp').factory('addDappModal', function (btfModal) {
    return btfModal({
        controller: 'addDappModalController',
        templateUrl: '/partials/modals/addDappModal.html'
    });
});
