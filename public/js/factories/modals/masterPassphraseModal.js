require('angular');

angular.module('liskApp').factory('masterPassphraseModal', function (btfModal) {
    return btfModal({
        controller: 'masterPassphraseModalController',
        templateUrl: '/partials/modals/masterPassphraseModal.html'
    });
});
