<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { Feature, Map, View } from 'ol'
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer'
import { Vector as VectorSource, XYZ } from 'ol/source'
import { LineString, Point } from 'ol/geom'
import { Circle, Fill, Icon, Stroke, Style } from 'ol/style'
import { fromLonLat, toLonLat } from 'ol/proj'
import type { Coordinate } from 'ol/coordinate'
import { Draw, Modify } from 'ol/interaction'
import { singleClick } from 'ol/events/condition'

const raster = new TileLayer({
  source: new XYZ({
    url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  }),
})

// 起点终点
const keyPoints = ref([
  [-74.0060, 40.7128], // 纽约市，美国
  [-99.1332, 19.4326], // 墨西哥城，墨西哥
])
// 途经点
const path = ref([
  [151.2093, -33.8688], // 悉尼，澳大利亚
  [-0.1278, 51.5074], // 伦敦，英国
  [18.4241, -33.9249], // 开普敦，南非
  [139.6917, 35.6895], // 东京，日本
])
const path2 = [
  [37.6173, 55.7558], // 莫斯科，俄罗斯
  [-58.3816, -34.6037], // 布宜诺斯艾利斯，阿根廷
  [2.3522, 48.8566], // 巴黎，法国
  [151.2093, -33.8688], // 悉尼，澳大利亚
  [-0.1278, 51.5074], // 伦敦，英国
  [18.4241, -33.9249], // 开普敦，南非
  [139.6917, 35.6895], // 东京，日本
]

// 起点终点
const initTransformedKeyPoints = computed<Coordinate[]>(() => keyPoints.value.map(item => fromLonLat(item)))
const keyPointFeatures = computed(() => initTransformedKeyPoints.value.map((item) => {
  const KeyPointFeature = new Feature({
    geometry: new Point(item),
  })
  KeyPointFeature.setStyle(new Style({
    image: new Circle({
      radius: 7,
      fill: new Fill({ color: '#ff0000' }),
      stroke: new Stroke({ color: '#000000', width: 2 }),
    }),
  }))
  KeyPointFeature.setProperties({
    type: 'KeyPoint',
  })
  return KeyPointFeature
}))
// 途经点连成线
const initTransformedPath = computed<Coordinate[]>(() => path.value.map(item => fromLonLat(item)))
const lineFeature = new Feature({
  geometry: new LineString(initTransformedPath.value),
})
lineFeature.setProperties({
  type: 'Path',
})

const source = new VectorSource()
source.addFeatures(keyPointFeatures.value)
source.addFeature(lineFeature)

const vector = new VectorLayer({
  source,
  style: (feature, _index) => {
    // 线条样式
    const styles = [
      new Style({
        stroke: new Stroke({
          color: '#ffcc33',
          width: 2,
        }),
      }),
    ]
    const geometry = feature.getGeometry()!
    if (geometry instanceof LineString) {
      const coordinates = geometry.getCoordinates()
      // 端点样式
      coordinates.forEach((item) => {
        styles.push(
          new Style({
            geometry: new Point(item),
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
      // 箭头样式
      for (let i = 0; i < coordinates.length - 1; i++) {
        const start = coordinates[i]
        const end = coordinates[i + 1]
        const dx = end[0] - start[0]
        const dy = end[1] - start[1]
        const rotation = Math.atan2(dy, dx)
        const midPoint = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2]
        styles.push(new Style({
          geometry: new Point(midPoint),
          image: new Icon({
            src: 'assets/arrow.png',
            anchor: [0.5, 0.5],
            rotateWithView: true,
            rotation: -rotation,
            scale: 0.2,
          }),
        }))
      }
    }
    return styles
  },
})

const mapRef = ref(null)
let map: Map | null = null

// 添加绘制、修改和选择交互
const draw = new Draw({
  source,
  type: 'LineString',
})
const modify = new Modify({
  deleteCondition: singleClick,
  source,
})
// 关键点移动结束之后，刷新路径点和关键点绑定的变量
// 避免点重复渲染的Flag
let flagModifyKeyPoint = false
// 避免线重复渲染的Flag
let flagModifyPath = false
modify.on('modifyend', (event) => {
  let flagKeyPointChange = false
  let flagPathChange = false
  event.features.forEach((item) => {
    const geometry = item.getGeometry()
    if (item.get('type') === 'KeyPoint' && geometry instanceof Point) {
      if (!initTransformedKeyPoints.value.some(item2 =>
        (item2[0] === geometry.getCoordinates()[0] && item2[1] === geometry.getCoordinates()[1]),
      )) {
        flagModifyKeyPoint = true
        flagKeyPointChange = true
        path.value = getRandomArrayElements(path2)
      }
    }
    else if (item.get('type') === 'Path' && geometry instanceof LineString) {
      flagModifyPath = true
      flagPathChange = true
    }
  })
  if (flagKeyPointChange) {
    keyPoints.value = keyPointFeatures.value
      .filter(item => item.get('type') === 'KeyPoint' && item.getGeometry() instanceof Point)
      .map(item => toLonLat(item.getGeometry()!.getCoordinates()))
  }
  if (flagPathChange) {
    path.value = lineFeature.getGeometry()!.getCoordinates().map(item => toLonLat(item))
  }
})
// 修改关键点后，刷新关键点渲染，同时刷新路径点
watch(keyPoints, () => {
  if (flagModifyKeyPoint) {
    flagModifyKeyPoint = false
    return
  }
  const features = vector.getSource()?.getFeatures()
  if (features) {
    features.forEach((item) => {
      if (item.get('type') === 'KeyPoint' && item.getGeometry() instanceof Point)
        vector.getSource()?.removeFeature(item)
    })
  }
  source.addFeatures(keyPointFeatures.value)
  path.value = getRandomArrayElements(path2)
}, {
  deep: true,
})
// 修改路径点后，刷新路径点渲染
watch(path, () => {
  if (flagModifyPath) {
    flagModifyPath = false
    return
  }
  const lineString = lineFeature.getGeometry()!
  let coordinates = lineString.getCoordinates()
  coordinates = initTransformedPath.value
  lineString.setCoordinates(coordinates)
}, {
  deep: true,
})

// 装载地图
onMounted(() => {
  map = new Map({
    target: mapRef.value!,
    layers: [raster, vector],
    view: new View({
      center: [0, 0],
      zoom: 2,
    }),
  })
  map.addInteraction(modify)
})

// 操作按钮
function drawLine() {
  map!.removeInteraction(modify)
  map!.addInteraction(draw)
}
function editLine() {
  map!.removeInteraction(draw)
  map!.addInteraction(modify)
}
function cancelLine() {
  map!.removeInteraction(draw)
  map!.removeInteraction(modify)
}
function addPoint() {
  keyPoints.value.push([116.4074, 39.9042])
  // path.value.push([16.4074, 39.9042])
}
function removePoint() {
  keyPoints.value.pop()
}

// For fun
function getRandomArrayElements(arr: Array<any>) {
  const count = Math.floor(Math.random() * (arr.length - 2)) + 3 // 随机数量，确保大于2
  const shuffled = arr.slice(0)
  let i = arr.length
  const min = i - count
  let temp
  let index
  while (i-- > min) {
    index = Math.floor((i + 1) * Math.random())
    temp = shuffled[index]
    shuffled[index] = shuffled[i]
    shuffled[i] = temp
  }
  return shuffled.slice(min)
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
  <button @click="addPoint">
    Add Point
  </button>
  <button @click="removePoint">
    Remove Point
  </button>
</template>

<style scoped>
.map {
  height: 95vh;
  width: 100%;
}
</style>
