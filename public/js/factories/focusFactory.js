require('angular');

angular.module('liskApp').factory('focusFactory', function ($timeout, $window) {
    return function (id) {
        $timeout(function () {
            var element = $window.document.getElementById(id);
            if (element)
                element.focus();
        });
    };
});
