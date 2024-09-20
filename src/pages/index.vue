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

const keyPoints = ref([
  [-74.0060, 40.7128],
  [-99.1332, 19.4326],
])
const path = ref([
  [151.2093, -33.8688],
  [-0.1278, 51.5074],
  [18.4241, -33.9249],
  [139.6917, 35.6895],
])
const path2 = [
  [37.6173, 55.7558],
  [-58.3816, -34.6037],
  [2.3522, 48.8566],
  [151.2093, -33.8688],
  [-0.1278, 51.5074],
  [18.4241, -33.9249],
  [139.6917, 35.6895],
]

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

const draw = new Draw({
  source,
  type: 'LineString',
})
const modify = new Modify({
  deleteCondition: singleClick,
  source,
})
let flagModifyKeyPoint = false
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
}
function removePoint() {
  keyPoints.value.pop()
}

function getRandomArrayElements(arr: Array<any>) {
  const count = Math.floor(Math.random() * (arr.length - 2)) + 3
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
