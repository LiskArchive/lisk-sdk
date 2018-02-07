require('angular');

angular.module('liskApp').filter('cut', function () {
    return function (value, wordwise, max, tail, enabled) {
        if (!value) return '';

        if (value.length < max) {
            return value;
        }

        if (enabled) {
            max = parseInt(max, 10);
            if (!max) return value;
            if (value.length <= max) return value;

            value = value.substr(0, max);
            if (wordwise) {
                var lastspace = value.lastIndexOf(' ');
                if (lastspace != -1) {
                    value = value.substr(0, lastspace);
                }
            }

            return value + (tail || ' …');
        } else {
            return value;
        }
    };
});
