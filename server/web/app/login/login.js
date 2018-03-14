'use strict';

var app = angular.module('ModuleAB-Login', []);

app.controller("Login", function($scope, $http, $window) {
  $scope.alertType = "alert-warning";
  $scope.fadein = "fadein";
  $http({
    method: "GET",
    url: "/api/v1/auth/check"
  }).then(function(response) {
    $window.location.href = "/";
  });

  $scope.login = {
    loginname: "",
    password: ""
  };

  $scope.doLogin = function(login) {
    $http({
      method: "POST",
      data: login,
      url: "/api/v1/auth/login"
    }).then(function(response) {
      $window.location.href = "/";
    }, function(response) {
      switch (response.status) {
        case 403:
          $scope.failMessage = "登录失败，用户名或密码不正确！";
          break;
        case 400:
          $scope.failMessage = "请求异常";
          break;
        case 500:
          $scope.failMessage = "服务端故障";
          break;
        default:
          $scope.failMessage = "通讯故障";
      }
      $scope.fadein += " fadein-opacity";
    });
  };

  $scope.keyevent = function(e) {
    var keycode = $window.event ? e.keyCode : e.which;
    if (keycode == 13) {
      $scope.doLogin($scope.login);
    }
  };
});
