<template>
  <div class="map" id="container"></div>
  <ConfirmDialog
    :is-visible="showLocationDialog"
    title="位置服务"
    message="是否允许使用IP定位服务来获取您的位置？"
    @confirm="handleLocationConfirm"
    @cancel="handleLocationCancel"
  />
</template>

<script>
import ConfirmDialog from './ConfirmDialog.vue'

export default {
  name: 'AMapContainer',
  components: {
    ConfirmDialog
  },
  data() {
    return {
      map: null,
      placeSearch: null,
      infoWindow: null,
      markers: [],
      showLocationDialog: false,
      defaultCenter: [113.324361, 23.10841]
    }
  },
  mounted() {
    // 设置安全密钥
    window._AMapSecurityConfig = {
      securityJsCode: import.meta.env.VITE_AMAP_SECURITY_CODE
    }

    // 动态加载高德地图脚本
    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${import.meta.env.VITE_AMAP_KEY}&plugin=AMap.PlaceSearch,AMap.InfoWindow`
    script.onload = () => {
      this.showLocationDialog = true
    }
    document.head.appendChild(script)
  },
  methods: {
    handleLocationConfirm() {
      this.showLocationDialog = false
      this.initMap(true)
    },
    handleLocationCancel() {
      this.showLocationDialog = false
      this.initMap(false)
    },
    initMap(useIpLocation) {
      const mapOptions = {
        resizeEnable: true,
        zoom: 13,
        isHotspot: true
      }
      
      if (!useIpLocation) {
        mapOptions.center = this.defaultCenter
      }
      
      this.map = new AMap.Map('container', mapOptions)

      this.placeSearch = new AMap.PlaceSearch()
      this.infoWindow = new AMap.InfoWindow({
        offset: new AMap.Pixel(0, -50)
      })

      this.setupMapEvents()
    },
    setupMapEvents() {
      this.map.on('hotspotclick', async (result) => {
        try {
          const details = await new Promise((resolve, reject) => {
            this.placeSearch.getDetails(result.id, (status, result) => {
              if (status === 'complete' && result.info === 'OK') {
                resolve(result)
              } else {
                reject(new Error('Failed to get details'))
              }
            })
          })
          this.handlePlaceSearchCallback(details)
        } catch (error) {
          console.error('Error getting place details:', error)
        }
      })

      this.map.on('click', (e) => {
        const marker = new AMap.Marker({
          position: e.lnglat,
          map: this.map
        })
        this.markers.push(marker)

        const mapContainerHeight = document.getElementById('container').offsetHeight
        if (e.pixel.y > mapContainerHeight / 2) {
          this.map.panBy(0, -300, 1000)
        }

        setTimeout(() => {
          marker.setMap(null)
          this.markers.pop()
        }, 2000)
      })
    },
    handlePlaceSearchCallback(data) {
      const poiArr = data.poiList.pois
      if (poiArr[0]) {
        const location = poiArr[0].location
        const poiInfo = `${poiArr[0].name}(${poiArr[0].address})`
        
        this.infoWindow.setContent(this.createContent(poiArr[0]))
        this.infoWindow.open(this.map, location)
        
        // 将事件名改为 send-message，直接触发消息发送
        this.$emit('send-message', poiInfo)
      }
    },
    createContent(poi) {
      const s = []
      s.push(`<div class="info-title">${poi.name}</div><div class="info-content">地址：${poi.address}`)
      s.push(`电话：${poi.tel}`)
      s.push(`类型：${poi.type}`)
      s.push('<div>')
      return s.join('<br>')
    }
  }
}
</script>

<style scoped>
.info-content img {
  float: left;
  margin: 3px;
}

.amap-info-combo .keyword-input {
  height: auto;
}
.amap-info-content amap-info-outer{
  color: #000000;
}
/* 修改高德地图信息窗体的默认样式 */
:deep(.amap-info-content) {
  background-color: #ffffff ;
  color: #000000 ;
}

:deep(.amap-info-content .info-title) {
  font-weight: bolder ;
  color: #111010 ;
  font-size: 14px ;
  width: 250px ;
  line-height: 26px ;
  padding: 0 0 0 6px ;
}

:deep(.amap-info-content .info-content) {
  width: 250px ;
  padding: 4px ;
  color: #000000 ;
  line-height: 20px ;
  font: 12px Helvetica, 'Hiragino Sans GB', 'Microsoft Yahei', '微软雅黑', Arial ;
  background-color: #ffffff ;
}
:deep(.amap-copyright) {
  color: #000000 ;
  font:  Helvetica, 'Hiragino Sans GB', 'Microsoft Yahei', '微软雅黑', Arial ;
}

.amap-info-content amap-info-outer{
  color: #000000;
}

:deep(.amap-geolocation) {
  top: 10px;
  right: 10px;
  bottom: auto;
  left: auto;
}
</style>