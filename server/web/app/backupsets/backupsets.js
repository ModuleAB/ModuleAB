'use strict';

angular.module('ModuleAB.backupsets', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/backupsets', {
    templateUrl: 'backupsets/backupsets.html',
    controller: 'backupSets'
  });
}])

.controller('backupSets', ['$scope', '$http', '$uibModal', '$rootScope',
  function($scope, $http, $uibModal, $rootScope) {
    $scope.backupSetsGet = function() {
      $http({
        method: "GET",
        url: "/api/v1/backupSets"
      }).then(function(response) {
        $scope.backupSets = response.data;
      }, function(response) {
        if (response.status == 404) {
          $scope.backupSets = null;
        }
      });
    };

    $scope.backupSetsGet();

    $scope.backupSetEdit = function(type, backupSet) {
      var modal = $uibModal.open({
        templateUrl: 'backupSetModal.html',
        controller: 'backupSetModal',
        resolve: {
          type: function() {
            return type;
          },
          backupSet: function() {
            return backupSet;
          }
        }
      });
      modal.result.then(function(d) {
        $scope.backupSetsGet();
      });
    };

    $scope.delete = function(backupSet) {
      var modal = $uibModal.open({
        templateUrl: 'common/deleteModal.html',
        controller: 'deleteBackupSetModal',
        resolve: {
          backupSet: function() {
            return backupSet;
          }
        }
      });
      modal.result.then(function(d) {
        $http({
          method: "DELETE",
          url: "/api/v1/backupSets/" + backupSet.name
        }).then(function(response) {
          $scope.backupSetsGet();
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
              $rootScope.failMessage = "无此备份集";
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

.controller('deleteBackupSetModal', function($scope, $uibModalInstance,
  backupSet) {
  $scope.cancel = function() {
    $uibModalInstance.dismiss('cancel');
  };
  $scope.doDelete = function() {
    $uibModalInstance.close('delete');
  }
  $scope.modalDeleteObjName = backupSet.name;
})

.controller('backupSetModal', function($scope, $http, $uibModalInstance, type,
  backupSet) {
  if (backupSet === undefined) {
    backupSet = {
      name: "",
      description: "",
      oss: {
        id: ""
      },
      oas: {
        id: ""
      }
    };
  }
  $scope.backupSet = backupSet;
  $scope.oldName = backupSet.name;

  $http({
    method: "GET",
    url: "/api/v1/oss"
  }).then(function(response) {
    $scope.osss = response.data;
  }, function(response) {
    // do nothing
  });

  $http({
    method: "GET",
    url: "/api/v1/oas"
  }).then(function(response) {
    $scope.oass = response.data;
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
  try {
    $scope.OssId = backupSet.oss.id;
  } catch (e) {
    $scope.OssId = "";
  }
  try {
    $scope.OasId = backupSet.oas.id;
  } catch (e) {
    $scope.OasId = "";
  }

  $scope.doJob = function() {
    if ($scope.backupSet.name == '') {
      $scope.modalInfoFadein = "fadein-opacity";
      $scope.modalInfoMsg = "备份集名称不能为空";
      return;
    }

    angular.forEach($scope.osss, function(s0) {
      if ($scope.OssId == s0.id) {
        $scope.backupSet.oss = s0;
        return;
      }
    });
    angular.forEach($scope.oass, function(s0) {
      if ($scope.OasId == s0.id) {
        $scope.backupSet.oas = s0;
        return;
      }
    })

    if ($scope.backupSet.oss.id == "") {
      $scope.modalInfoFadein = "fadein-opacity";
      $scope.modalInfoMsg = "请指定一个OSS";
      return;
    }

    if ($scope.backupSet.oas.id == "") {
      $scope.backupSet.oas = null;
    }

    switch (type) {
      case 'new':
        $http({
          method: "POST",
          url: "/api/v1/backupSets",
          data: $scope.backupSet
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
          url: "/api/v1/backupSets/" + $scope.oldName,
          data: $scope.backupSet
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
              $scope.modalInfoMsg = "无此备份集";
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
