require('angular');
angular.module('liskApp').directive('input', function () {
    return {
        restrict: 'E',
        require: '?ngModel',
        link: function (scope, element, attrs, ngModel) {
            if ('type' in attrs && attrs.type.toLowerCase() === 'range') {
                ngModel.$parsers.push(parseFloat);
            }
        }
    };
});
