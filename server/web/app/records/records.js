'use strict';

angular.module('ModuleAB.records', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/records', {
    templateUrl: 'records/records.html',
    controller: 'records'
  });
}])

.controller('records', ['$scope', '$http', '$uibModal', '$rootScope',
  function($scope, $http, $uibModal, $rootScope) {
    $scope.types = {
      1: "备份",
      2: "归档"
    };
    $scope.currentPage = 1;
    $scope.numPerPage = 15;
    $scope.recordsGet = function(query) {
      if (query === undefined || query == '') {
        var url = "/api/v1/records";
      } else {
        var url = "/api/v1/records?" + query;
      }
      $http({
        method: "GET",
        url: url
      }).then(function(response) {
        $scope.records = response.data;
        if ($scope.records.length > $scope.numPerPage) {
          $scope.$watch("currentPage + numPerPage", function() {
            var begin = ($scope.currentPage - 1) * $scope.numPerPage
            var end = begin + $scope.numPerPage;
            $scope.recordSlice = $scope.records.slice(begin, end)
          });
        } else {
          $scope.recordSlice = $scope.records
        }
      }, function(response) {
        if (response.status == 404) {
          $scope.recordSlice = null;
        }
      });
    };

    $scope.recordsGet();

    $scope.recordEdit = function() {
      var modal = $uibModal.open({
        templateUrl: 'recordModal.html',
        controller: 'recordModal'
      });
      modal.result.then(function(d) {
        $scope.recordsGet(d);
      });
    };

    $scope.orderBy = function(o) {
      $scope.order = o;
    }

    $scope.delete = function(record) {
      var modal = $uibModal.open({
        templateUrl: 'common/deleteModal.html',
        controller: 'deleteRecordModal',
        resolve: {
          record: function() {
            return record;
          }
        }
      });
      modal.result.then(function(d) {
        $http({
          method: "DELETE",
          url: "/api/v1/records/" + record.id
        }).then(function(response) {
          $scope.recordsGet();
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
              $rootScope.failMessage = "无此记录";
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

    $scope.recover = function(record) {
      var modal = $uibModal.open({
        templateUrl: "recover.html",
        controller: "recoverModal",
        resolve: {
          record: function() {
            return record;
          }
        }
      });
      modal.result.then(function(d) {
        $http({
          method: "GET",
          url: "/api/v1/records/" + record.id + "/recover"
        }).then(function(response) {
          if (record.type == 2) {
            $rootScope.failMessage =
              '此记录是一个归档，需要等待一段时间才会恢复到原来的位置';
          } else if (record.type == 1) {
            $rootScope.failMessage = '此记录是一个备份，客户端已开始下载此备份';
          }
          $rootScope.alertType = 'alert-success';
          $rootScope.fadein = 'fadein-opacity';
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
              $rootScope.failMessage = "无此记录";
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
    }
  }
])

.controller('deleteRecordModal', function($scope, $uibModalInstance, record) {
  $scope.cancel = function() {
    $uibModalInstance.dismiss('cancel');
  };
  $scope.doDelete = function() {
    $uibModalInstance.close('delete');
  }
  $scope.modalDeleteObjName = record.path.path + '/' + record.filename;
})

.controller('recoverModal', function($scope, $uibModalInstance, record) {
  $scope.cancel = function() {
    $uibModalInstance.dismiss('cancel');
  }
  $scope.doJob = function() {
    $uibModalInstance.close('recover');
  }
  $scope.record = record;
})

.controller('recordModal', function($scope, $http, $uibModalInstance) {
  $scope.limit = 50;
  $scope.datePickerOptions = {
    maxDate: new Date(),
    minDate: new Date(2000, 1, 1),
    startingDay: 1
  };
  $http({
    method: "GET",
    url: "/api/v1/hosts"
  }).then(function(response) {
    $scope.hosts = response.data;
  }, function(response) {});
  $http({
    method: "GET",
    url: "/api/v1/appSets"
  }).then(function(response) {
    $scope.appSets = response.data;
  }, function(response) {});
  $http({
    method: "GET",
    url: "/api/v1/backupSets"
  }).then(function(response) {
    $scope.backupSets = response.data;
  }, function(respones) {});
  $http({
    method: "GET",
    url: "/api/v1/paths"
  }).then(function(response) {
    $scope.paths = response.data;
  }, function(response) {});
  $scope.cancel = function() {
    $uibModalInstance.dismiss('cancel');
  };
  $scope.doJob = function() {
    var query = '';
    if ($scope.selectedHost && $scope.selectedHost != '') {
      query += 'host=' + $scope.selectedHost + '&';
    }
    if ($scope.selectedAppSet && $scope.selectedAppSet != '') {
      query += 'appSet=' + $scope.selectedAppSet + '&';
    }
    if ($scope.selectedBackupSet && $scope.selectedBackupSet != '') {
      query += 'backupSet=' + $scope.selectedBackupSet + '&';
    }
    if ($scope.selectedPath && $scope.selectedPath != '') {
      query += 'path=' + $scope.selectedPath + '&';
    }
    if ($scope.filename && $scope.filename != '') {
      query += 'filename=' + $scope.filename + '&';
    }
    if ($scope.limit && $scope.limit > 0) {
      query += 'limit=' + $scope.limit.toString() + '&';
    }
    if ($scope.btStart) {
      query += 'btStart=' + $scope.btStart.formatRFC3339() + '&';
    }
    if ($scope.btEnd) {
      query += 'btEnd=' + $scope.btEnd.formatRFC3339() + '&';
    }
    if ($scope.atStart) {
      query += 'atStart=' + $scope.atStart.formatRFC3339() + '&';
    }
    if ($scope.atEnd) {
      query += 'atEnd=' + $scope.atEnd.formatRFC3339() + '&';
    }
    $uibModalInstance.close(query);
  };
})
