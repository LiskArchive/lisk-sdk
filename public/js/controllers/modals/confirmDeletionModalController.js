require('angular');

angular.module('liskApp').controller('confirmDeletionModalController', ["$scope", "confirmDeletionModal", function ($scope, confirmDeletionModal) {

    $scope.close = function (yesDelete) {
        if ($scope.destroy) {
            $scope.destroy(yesDelete);
        }
        confirmDeletionModal.deactivate();
    }

}]);
