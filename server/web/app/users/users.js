'use strict';

angular.module('ModuleAB.users', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/users', {
    templateUrl: 'users/users.html',
    controller: 'users'
  });
}])

.controller('users', ['$scope', '$http', '$uibModal', '$rootScope',
  function($scope, $http, $uibModal, $rootScope) {
    $scope.usersGet = function() {
      $http({
        method: "GET",
        url: "/api/v1/users"
      }).then(function(response) {
        $scope.users = response.data;
      }, function(response) {});
    };

    $scope.usersGet();

    $scope.userEdit = function(type, user) {
      var modal = $uibModal.open({
        templateUrl: 'userModal.html',
        controller: 'userModal',
        resolve: {
          type: function() {
            return type;
          },
          user: function() {
            return user;
          }
        }
      });
      modal.result.then(function(d) {
        $scope.usersGet();
      });
    };

    $scope.delete = function(user) {
      var modal = $uibModal.open({
        templateUrl: 'common/deleteModal.html',
        controller: 'deleteUserModal',
        resolve: {
          user: function() {
            return user;
          }
        }
      });
      modal.result.then(function(d) {
        $http({
          method: "DELETE",
          url: "/api/v1/users/" + user.loginname
        }).then(function(response) {
          $scope.usersGet();
        }, function(response) {
          $rootScope.alertType = 'alert-warning';
          $rootScope.fadein = 'fadein-opacity';
          switch (response.status) {
            case 401:
              window.location.href = "/login";
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
      });
    };
  }
])

.controller('deleteUserModal', function($scope, $uibModalInstance, user) {
  $scope.cancel = function() {
    $uibModalInstance.dismiss('cancel');
  };
  $scope.doDelete = function() {
    $uibModalInstance.close('delete');
  }
  $scope.modalDeleteObjName = user.name;
})

.controller('userModal', function($scope, $http, $uibModalInstance, type,
  user) {
  if (user === undefined) {
    user = {
      loginname: "",
      password: "",
      name: "",
      Roles: [],
      removable: true
    };
  }
  $scope.user = user
  $scope.password2 = user.password;
  $http({
    method: "GET",
    url: "/api/v1/roles"
  }).then(function(response) {
    $scope.roles = response.data;
  }, function(response) {
    // do nothing.
  });
  $scope.selectedRoles = [];
  $scope.$watch('user.Roles', function(s) {
    if (!s) {
      return;
    }
    angular.forEach(s, function(v) {
      $scope.selectedRoles.push(v.id.toString());
    });
  });

  switch (type) {
    case 'new':
      $scope.type = "新增";
      $scope.jobType = "fa-plus";
      $scope.job = "新增"
      $scope.isModifyMode = false;
      break;
    case 'modify':
      $scope.type = "修改";
      $scope.jobType = "fa-pencil";
      $scope.job = "修改";
      $scope.isModifyMode = true;
      break;
  }
  $scope.modalInfoFadein = "";
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
    $scope.user.Roles = [];
    angular.forEach($scope.selectedRoles, function(s0) {
      angular.forEach($scope.roles, function(s1) {
        if (s1.id == s0) {
          $scope.user.Roles.push(s1);
        }
      });
    });
    if ($scope.user.Roles.length == 0) {
      $scope.modalInfoFadein = "fadein-opacity";
      $scope.modalInfoMsg = "请指定至少一个用户角色";
      return;
    }

    switch (type) {
      case 'new':
        $http({
          method: "POST",
          url: "/api/v1/users",
          data: $scope.user
        }).then(function(response) {
          $uibModalInstance.close(response.data.id);
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
            case 500:
              $scope.modalInfoMsg = "服务器错误，见控制台输出";
              console.log(response.data);
              break;
            default:
              $scope.modalInfoMsg = "通讯故障";
              break;
          }
        });
        break;
      case 'modify':
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
        break;
    }
  }
  $scope.cancel = function() {
    $uibModalInstance.dismiss('cancel');
  }
});
