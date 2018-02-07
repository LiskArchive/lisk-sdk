require('angular');

angular.module('liskApp').factory('addContactModal', function (btfModal) {
    return btfModal({
        controller: 'addContactModalController',
        templateUrl: '/partials/modals/addContactModal.html'
    });
});
