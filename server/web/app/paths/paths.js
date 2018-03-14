'use strict';

angular.module('ModuleAB.paths', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/paths', {
    templateUrl: 'paths/paths.html',
    controller: 'paths'
  });
}])

.controller('paths', ['$scope', '$http', '$uibModal', '$rootScope',
  function($scope, $http, $uibModal, $rootScope) {
    $scope.pathsGet = function() {
      $http({
        method: "GET",
        url: "/api/v1/paths"
      }).then(function(response) {
        $scope.paths = response.data;
      }, function(response) {
        if (response.status == 404) {
          $scope.paths = null;
        }
      });
    };

    $scope.pathsGet();

    $scope.pathEdit = function(type, path) {
      var modal = $uibModal.open({
        templateUrl: 'pathModal.html',
        controller: 'pathModal',
        resolve: {
          type: function() {
            return type;
          },
          path: function() {
            return path;
          }
        }
      });
      modal.result.then(function(d) {
        $scope.pathsGet();
      });
    };

    $scope.delete = function(path) {
      var modal = $uibModal.open({
        templateUrl: 'common/deleteModal.html',
        controller: 'deletePathModal',
        resolve: {
          path: function() {
            return path;
          }
        }
      });
      modal.result.then(function(d) {
        $http({
          method: "DELETE",
          url: "/api/v1/paths/" + path.id
        }).then(function(response) {
          $scope.pathsGet();
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
              $rootScope.failMessage = "无此路径";
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

.controller('deletePathModal', function($scope, $uibModalInstance, path) {
  $scope.cancel = function() {
    $uibModalInstance.dismiss('cancel');
  };
  $scope.doDelete = function() {
    $uibModalInstance.close('delete');
  }
  $scope.modalDeleteObjName = path.path;
})

.controller('pathModal', function($scope, $http, $uibModalInstance, type,
  path) {
  if (path === undefined) {
    path = {
      path: "",
      backupset: {
        id: ""
      },
      appset: []
    };
  }
  $scope.path = path;

  $http({
    method: "GET",
    url: "/api/v1/backupSets"
  }).then(function(response) {
    $scope.backupSets = response.data;
  }, function(response) {
    // do nothing
  });

  $http({
    method: "GET",
    url: "/api/v1/appSets"
  }).then(function(response) {
    $scope.appSets = response.data;
  }, function(response) {
    // do nothing
  });

  switch (type) {
    case 'new':
      $scope.type = "新增";
      $scope.jobType = "fa-plus";
      $scope.job = "新增"
      break;
    case 'modify':
      $scope.type = "修改";
      $scope.jobType = "fa-pencil";
      $scope.job = "修改";
      break;
  }

  $scope.modalInfoFadein = "";
  $scope.backupSetId = path.backupset.id;
  $scope.appSetIds = [];
  $scope.$watch('path.appset', function(s) {
    if (!s) {
      return;
    }
    angular.forEach(s, function(v) {
      $scope.appSetIds.push(v.id.toString());
    });
  });

  $scope.doJob = function() {
    if (!$scope.path.path.match(/^\/.*[^\/]$/)) {
      $scope.modalInfoFadein = "fadein-opacity";
      $scope.modalInfoMsg = "路径应当是绝对路径，且不以'/'结尾";
      return;
    }

    angular.forEach($scope.backupSets, function(s0) {
      if ($scope.backupSetId == s0.id) {
        $scope.path.backupset = s0;
        return;
      }
    });

    $scope.path.appset = [];
    angular.forEach($scope.appSetIds, function(s0) {
      angular.forEach($scope.appSets, function(s1) {
        if (s1.id == s0) {
          $scope.path.appset.push(s1);
        }
      });
    });
    if ($scope.path.backupset.id == "") {
      $scope.modalInfoFadein = "fadein-opacity";
      $scope.modalInfoMsg = "请指定一个备份集";
      return;
    }
    if ($scope.path.appset.length == 0) {
      $scope.modalInfoFadein = "fadein-opacity";
      $scope.modalInfoMsg = "请指定至少一个应用集";
      return;
    }

    switch (type) {
      case 'new':
        $http({
          method: "POST",
          url: "/api/v1/paths",
          data: $scope.path
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
          url: "/api/v1/paths/" + $scope.path.id,
          data: $scope.path
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
              $scope.modalInfoMsg = "无此路径";
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
