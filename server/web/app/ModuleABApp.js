'use strict';

angular.module('ModuleAB', [
    'ngRoute',
    'ui.bootstrap',
    'angular-loading-bar',
    'ngAnimate',
    'ModuleAB.appsets',
    'ModuleAB.records',
    'ModuleAB.policies',
    'ModuleAB.hosts',
    'ModuleAB.paths',
    'ModuleAB.backupsets',
    'ModuleAB.oss',
    'ModuleAB.oas',
    'ModuleAB.users',
    'ModuleAB.clientjobs',
    'ModuleAB.faillogs',
  ])
  .config(['$routeProvider', function($routeProvider) {
    $routeProvider.otherwise({
      redirectTo: '/hosts'
    });
  }])
  .config(['cfpLoadingBarProvider', function(cfpLoadingBarProvider) {
    cfpLoadingBarProvider.includeSpinner = false;
  }])
  .controller("topNavBar", ['$scope', '$http', '$uibModal', '$rootScope',
    '$window',
    function($scope, $http, $uibModal, $rootScope, $window) {
      $rootScope.dismiss = function() {
        $rootScope.fadein = '';
      };
      $rootScope.dismiss();

      $http({
        method: "GET",
        url: "/api/v1/auth/check"
      }).then(function(response) {
        $scope.session = response.data;
        $rootScope.loaded = true;
      }, function(response) {
        $window.location.href = "/login";
      });
      $scope.logout = function() {
        $http({
          method: "GET",
          url: "/api/v1/auth/logout"
        }).then(function(response) {
          $window.location.href = "/login";
        }, function(response) {
          switch (response.status) {
            case 401:
              $window.location.href = "/login";
              break;
          }
        });
      };

      $scope.about = function() {
        $uibModal.open({
          templateUrl: "aboutModal.html",
          controller: "aboutModal"
        });
      };

      $scope.profile = function() {
        $uibModal.open({
          templateUrl: "userProfileModal.html",
          controller: "userProfileModal",
          resolve: {
            session: function() {
              return $scope.session;
            }
          }
        });
      };
    }
  ])

.controller('aboutModal', function($scope, $http, $uibModalInstance) {
  $http({
    method: "GET",
    url: "/api/v1/version"
  }).then(function(response) {
    $scope.version = response.data;
  });
  $scope.cancel = function() {
    $uibModalInstance.dismiss('cancel');
  };
})

.controller('userProfileModal', function($scope, $http, $uibModalInstance,
  $window, session) {
  $http({
    method: "GET",
    url: "/api/v1/users/" + session.name
  }).then(function(response) {
    $scope.user = response.data[0];
    $scope.password2 = $scope.user.password;
  }, function(response) {
    $rootScope.alertType = 'alert-warning';
    $rootScope.fadein = 'fadein-opacity';
    switch (response.status) {
      case 401:
        $window.location.href = "/login";
        break;
      case 403:
        $rootScope.failMessage = "没有权限";
        break;
      case 404:
        $rootScope.failMessage = "无此用户";
        break;
      case 500:
        $rootScope.failMessage = "服务器错误，见控制台输出";
        console.log(response.data);
        break;
      default:
        $rootScope.failMessage = "通讯故障";
        break;
    }
  });

  $scope.doJob = function() {
    if ($scope.user.loginname == '') {
      $scope.modalInfoFadein = "fadein-opacity";
      $scope.modalInfoMsg = "登录名不能为空";
      return;
    }
    if ($scope.user.name == '') {
      $scope.modalInfoFadein = "fadein-opacity";
      $scope.modalInfoMsg = "显示名不能为空";
      return;
    }
    if (!$scope.user.password.match(/.{8,32}/)) {
      $scope.modalInfoFadein = "fadein-opacity";
      $scope.modalInfoMsg = "密码长度为8-32位！";
      return;
    }
    if ($scope.user.password != $scope.password2) {
      $scope.modalInfoFadein = "fadein-opacity";
      $scope.modalInfoMsg = "两次输入的密码不一致！";
      return;
    }

    $http({
      method: "PUT",
      url: "/api/v1/users/" + $scope.user.loginname,
      data: $scope.user
    }).then(function(response) {
      $uibModalInstance.close(response.status);
    }, function(response) {
      $scope.modalInfoFadein = "fadein-opacity";
      switch (response.status) {
        case 400:
          $scope.modalInfoMsg = "数据错误";
          break;
        case 401:
          $scope.modalInfoMsg = "未登录";
          window.location.href = "/login";
          break;
        case 403:
          $scope.modalInfoMsg = "访问被拒绝";
          break;
        case 404:
          $scope.modalInfoMsg = "无此用户";
          break;
        case 500:
          $scope.modalInfoMsg = "服务器错误，见控制台输出";
          console.log(response.data);
          break;
        default:
          $scope.modalInfoMsg = "通讯故障";
          break;
      }
    });
  };

  $scope.cancel = function() {
    $uibModalInstance.dismiss('cancel');
  };
});
