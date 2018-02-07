require('angular');

angular.module('liskApp').factory('multiMembersModal', function (btfModal) {
    return btfModal({
        controller: 'multiMembersModalController',
        templateUrl: '/partials/modals/multiMembersModal.html'
    });
});
