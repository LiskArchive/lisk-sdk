require('angular');

angular.module('liskApp').factory('multisignatureModal', function (btfModal) {
    return btfModal({
        controller: 'multisignatureModalController',
        templateUrl: '/partials/modals/multisignatureModal.html'
    });
});
