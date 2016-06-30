// 需要加载http://api.map.baidu.com/api?v=2.0&ak=DmMSdcEILbFTUHs4QvlcV2G0
// 封装参考官方API，http://developer.baidu.com/map/reference/index.php
var whcyitBaiduMapModule = angular.module('whcyit-baidu-map', []);

whcyitBaiduMapModule.service('$cyBaiduMap', ['$q', '$timeout', function ($q, $timeout) {
  return {
    initMap: initMap, //初始化地图
    getMap: getMap, //返回当前地图对象
    geoLocation: geoLocation, //获取当前位置
    geoLocationAndCenter: geoLocationAndCenter, //获取当前位置，并将地图移动到当前位置
    drawMarkers: drawMarkers, //添加兴趣点
    addMarker: addMarker,
    drawMassPoints: drawMassPoints, // 绘制海量数据点
    setCurrentCity: setCurrentCity,
    clearOverlays: clearOverlays,
    panTo: panTo,
    translateGps: translateGps // 把原始gps信号转换为百度gps信号
  };

  var map;

  function getMap() {
    return map;
  }

  function setCurrentCity(city) {
    getMap().setCurrentCity(city);
  }

  function initMap(opts, element) {
    var defer = $q.defer();
    map = new BMap.Map(element[0]);
    ;
    $timeout(function () {
      map.centerAndZoom(new BMap.Point(opts.center.lng, opts.center.lat), opts.zoom);
      if (opts.navCtrl) {
        map.addControl(new BMap.NavigationControl());
      }
      if (opts.scaleCtrl) {
        map.addControl(new BMap.ScaleControl());
      }
      if (opts.overviewCtrl) {
        map.addControl(new BMap.OverviewMapControl());
      }
      if (opts.enableScrollWheelZoom) {
        map.enableScrollWheelZoom();
      }
      map.setCurrentCity(opts.city);
      defer.resolve();
    });
    return defer.promise;
  }

  function translateGps(gpsInfos) {
    return $q(function (resolve) {
      if (!angular.isArray(gpsInfos)) {
        gpsInfos = [gpsInfos];
      }

      var points = [];
      angular.forEach(gpsInfos, function (gpsInfo) {
        points.push(new BMap.Point(gpsInfo.lng, gpsInfo.lat));
      });

      var convertor = new BMap.Convertor();
      convertor.translate(points, 1, 5, resolve);
    });
  }

  function geoLocation() {
    var defer = $q.defer(), location = new BMap.Geolocation();//百度地图定位实例
    location.getCurrentPosition(function (result) {
      if (this.getStatus() === BMAP_STATUS_SUCCESS) {
        //定位成功,返回定位地点和精度
        defer.resolve(result);
      } else {
        defer.reject('不能获取位置');
      }
    }, function (err) {
      defer.reject('定位失败');
    });
    return defer.promise;
  }

  function clearOverlays() {
    getMap().clearOverlays();
  }

  function panTo(point) {
    getMap().panTo(point);
  }

  function geoLocationAndCenter() {
    var defer = $q.defer();
    geoLocation().then(function (result) {
      panTo(result.point);
      defer.resolve(result);
    }, function () {
      defer.reject('定位失败');
    });
    return defer.promise;
  }

  function _createIcon(marker) {
    if (marker.icon) {
      if (marker.size) {
        return new BMap.Icon(marker.icon, new BMap.Size(marker.size.width, marker.size.height));
      }
      return new BMap.Icon(marker.icon);
    }

    return null;
  }

  function _createInfoWindow(marker) {
    if (marker.infoWindow) {
      var msg = '<p>' + (marker.infoWindow.title || '') + '</p><p>' + (marker.infoWindow.content || '') + '</p>';
      return new BMap.InfoWindow(msg, {
        enableMessage: !!marker.infoWindow.enableMessage,
        enableCloseOnClick: true
      });
    }

    return null;
  }

  function _createMarker(marker) {
    var icon = _createIcon(marker);
    var pt = new BMap.Point(marker.lng, marker.lat);
    if (icon) {
      return new BMap.Marker(pt, {icon: icon});
    }
    return new BMap.Marker(pt);
  }

  function addMarker(obj, clickHandler) {
    var marker = _createMarker(obj);
    var infoWindow = _createInfoWindow(obj);
    if (infoWindow) {
      marker.addEventListener('click', function () {
        this.openInfoWindow(infoWindow);
      });
    } else if (clickHandler) {
      marker.addEventListener('click', clickHandler);
    }
    getMap().addOverlay(marker);
  }

  function drawMarkers(markers, clickHandler) {
    var _markers = [],//待添加的兴趣点列表
      defer = $q.defer(),
      _length,//数组长度
      _progress;//当前正在添加的点的索引
    $timeout(function () {
      //判断是否含有定位点
      if (!markers) {
        defer.reject('没有传入兴趣点');
        return;
      }

      if (!angular.isArray(markers)) {
        _markers.push(markers);
      } else {
        _markers = markers;
      }

      clearOverlays();
      _length = _markers.length - 1;
      angular.forEach(_markers, function (obj, index) {
        _progress = index;
        addMarker(obj);
        defer.notify(_progress);
        if (index === _length) {
          defer.resolve();
        }
      });
    });
    return defer.promise;
  }

  function drawMassPoints(markers, opts, clickHandler) {
    var _markers = [],//待添加的兴趣点列表
      defer = $q.defer();
    $timeout(function () {
      //判断是否含有定位点
      if (!markers) {
        defer.reject('没有传入兴趣点');
        return;
      }

      if (!angular.isArray(markers)) {
        defer.reject('请传入数组');
        return;
      }

      clearOverlays();

      var points = [];
      for (var i = 0; i < markers.length; i++) {
        var marker = markers[i];
        points.push(new BMap.Point(marker.lng, marker.lat));
      }

      var pointCollection = new BMap.PointCollection(points, angular.extend({
        size: BMAP_POINT_SIZE_SMALL,
        shape: BMAP_POINT_SHAPE_CIRCLE,
        color: '#d340c3'
      }, opts));

      if (clickHandler) {
        pointCollection.addEventListener('click', clickHandler);
      }

      map.addOverlay(pointCollection);
      defer.resolve();
    });
    return defer.promise;
  }
}]);

whcyitBaiduMapModule.directive('cyBaiduMap', ['$cyBaiduMap', function ($cyBaiduMap) {
  var defaultOpts = {
    navCtrl: true,
    scaleCtrl: true,
    overviewCtrl: true,
    enableScrollWheelZoom: false,
    zoom: 10,
    city: '武汉',
    mass: {
      enabled: false,
      options: {}
    }
  };

  return {
    restrict: 'E',
    template: '<div class="map"></div>',
    scope: {
      options: '=',
      onMarkClick: '&', // event {type, target} if mass event{type, target,point}
      onMapClick: '&' // event {type, target, point, pixel, overlay}
    },
    link: function (scope, element, attrs, ctrl) {
      var opts = angular.merge({}, defaultOpts, scope.options);

      $cyBaiduMap.initMap(opts, element);
      if (scope.onMapClick) {
        $cyBaiduMap.getMap().addEventListener('click', scope.onMapClick);
      }

      function doDraw(markers) {
        if (opts.mass.enabled) {
          $cyBaiduMap.drawMassPoints(markers, opts.mass.options, scope.onMarkClick);
          return;
        }
        $cyBaiduMap.drawMarkers(markers, scope.onMarkClick);
      }

      doDraw(opts.markers);

      var unwatchCenter = scope.$watch('options.center', function (center) {
        $cyBaiduMap.panTo(new BMap.Point(center.lng, center.lat));
      });

      var unwatchMarkers = scope.$watch('options.markers', function (markers) {
        doDraw(markers);
      });

      scope.$on('$destroy', function () {
        unwatchCenter();
        unwatchMarkers();
        if (scope.onMapClick) {
          $cyBaiduMap.getMap().removeEventListener('click', scope.onMapClick);
        }
      });
    }
  };
}]);
