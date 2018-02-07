require('angular');

angular.module('liskApp').controller("freeModalController", ["$scope", "freeModal", function ($scope, freeModal) {

    $scope.close = function () {
        freeModal.deactivate();
    }

}]);
