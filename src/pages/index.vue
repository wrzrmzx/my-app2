<script setup>
import 'ol/ol.css'
import { Feature, Map, View } from 'ol'
import TileLayer from 'ol/layer/Tile'
import XYZ from 'ol/source/XYZ'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Draw, Modify, Select } from 'ol/interaction'
import { Circle, Fill, Stroke, Style } from 'ol/style'
import Point from 'ol/geom/Point'
import { LineString } from 'ol/geom'
import { click } from 'ol/events/condition'
import { fromLonLat } from 'ol/proj'
import { computed } from 'vue'

const mapRef = ref < HTMLDivElement > (null)

// 创建地图和图层
const raster = new TileLayer({
  source: new XYZ({
    url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  }),
})

const points = ref([
  [40.7128, -74.0060],
  [33.9249, 18.4241],
  [19.4326, -99.1332],
])
const transformedCoordinates = computed(() => points.value.map(coord => fromLonLat(coord)))

const lineFeature = computed(() => new Feature({
  geometry: new LineString(transformedCoordinates),
}))
const path = [
  [40.7128, -74.0060],
  [33.8688, 151.2093],
  [51.5074, -0.1278],
  [33.9249, 18.4241],
  [35.6895, 139.6917],
  [55.7558, 37.6173],
  [-34.6037, -58.3816],
  [48.8566, 2.3522],
  [19.4326, -99.1332],
]
const source = new VectorSource()
const vector = new VectorLayer({
  source,
  style: (feature) => {
    const styles = [
      new Style({
        stroke: new Stroke({
          color: '#ffcc33',
          width: 2,
        }),
      }),
    ]

    const geometry = feature.getGeometry()
    if (geometry instanceof LineString) {
      const coordinates = geometry.getCoordinates()
      coordinates.forEach((coordinate, _index) => {
        styles.push(
          new Style({
            geometry: new Point(coordinate),
            image: new Circle({
              radius: 5,
              fill: new Fill({
                color: 'rgba(255, 255, 255, 0.8)',
              }),
              stroke: new Stroke({
                color: '#ffcc33',
                width: 2,
              }),
            }),
          }),
        )
      })
    }

    return styles
  },
})

let map = null
onMounted(() => {
  map = new Map({
    target: mapRef.value,
    layers: [raster, vector],
    view: new View({
      center: [0, 0],
      zoom: 2,
    }),
  })
})

// 添加绘制和修改交互
const draw = new Draw({
  source,
  type: 'LineString',
})

const modify = new Modify({
  // deleteCondition: () => true,
  source,
})

// 添加选择交互
const select = new Select({
  condition: click,
  style: new Style({
    image: new Circle({
      radius: 7,
      fill: new Fill({
        color: 'rgba(255, 0, 0, 0.8)', // 高亮颜色
      }),
      stroke: new Stroke({
        color: '#ff0000',
        width: 2,
      }),
    }),
  }),
})

function drawLine() {
  map.removeInteraction(modify)
  map.addInteraction(draw)
}

function editLine() {
  map.removeInteraction(draw)
  map.addInteraction(modify)
}

function cancelLine() {
  map.removeInteraction(draw)
  map.removeInteraction(modify)
  map.addInteraction(select)
}
</script>

<template>
  <div ref="mapRef" class="map" />
  <button @click="drawLine">
    Draw Line
  </button>
  <button @click="editLine">
    Edit Line
  </button>
  <button @click="cancelLine">
    End Line
  </button>
</template>

<style scoped>
.map {
  height: 95vh;
  width: 100%;
}
</style>
