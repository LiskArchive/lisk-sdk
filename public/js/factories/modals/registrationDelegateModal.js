require('angular');

angular.module('liskApp').factory('registrationDelegateModal', function (btfModal) {
    return btfModal({
        controller: 'registrationDelegateModalController',
        templateUrl: '/partials/modals/registrationDelegateModal.html'
    });
});
