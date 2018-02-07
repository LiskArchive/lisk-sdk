require('angular');

angular.module('liskApp').factory('confirmDeletionModal', function (btfModal) {
    return btfModal({
        controller: 'confirmDeletionModalController',
        templateUrl: '/partials/modals/confirmDeletionModal.html'
    });
});
