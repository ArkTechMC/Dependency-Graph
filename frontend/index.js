import Chart from 'roc-charts'
import { configResolver, dataParser, root } from './static'
import { getBase64 } from './base64'

const tauri = window.tauri = window.__TAURI__
let chart, chartData = {}, processingFiles = [], processingIcon = [], modData = {}, modIdMapping = {}, imageMap = {}, builtinIcons = {}
const ignoreModId = ['*', 'minecraft', 'java']
let currentLoader = 'fabric'

window.onload = async _ => {
  document.getElementById("open-folder").onclick = openModFolder
  tauri.event.listen('mod-config-read', e => {
    let index = processingFiles.indexOf(e.payload.file)
    if (index == -1) return
    processingFiles.splice(index, 1)
    if (!e.payload.success) return
    try {
      let obj = dataParser[currentLoader](e.payload)
      console.log(obj)
      let data = configResolver[currentLoader](obj)
      modIdMapping[data.id] = modData[e.payload.file] = data
      processingIcon.push(e.payload.file)
      const f = e.payload.file
      tauri.invoke('read_mod_icon', { zip: f, path: data.logo }).catch(e => {
        let index = processingIcon.indexOf(f)
        if (index >= 0) processingIcon.splice(index, 1)
        console.log(e)
      })
    } catch (e) {
      console.log(e)
    }
  })
  tauri.event.listen('mod-icon-read', e => {
    let index = processingIcon.indexOf(e.payload.file)
    if (index == -1) return
    processingIcon.splice(index, 1)
    if (!e.payload.success) return
    console.log(e.payload)
    imageMap[modData[e.payload.file]?.id] = 'data:image/png;base64,' + e.payload.data
    if (processingIcon.length == 0) loadGraph()
  })
  builtinIcons.forge = await getBase64('/img/forge.webp').catch(console.log)
  builtinIcons.fabricloader = await getBase64('/img/fabric.png').catch(console.log)
  builtinIcons.neoforge = await getBase64('/img/neoforge.png').catch(console.log)
  builtinIcons.unknown = await getBase64('/img/unknown.png').catch(console.log)
  createChart()
}

window.onresize = e => {
  let chart = document.getElementById('chart')
  chart.style.width = (e.target.innerWidth - 20) + 'px'
  chart.style.height = (e.target.innerHeight - 180) + 'px'
  removeChart()
  createChart()
}

const updateLoaderType = _ => {
  for (let i of ['forge', 'fabric', 'neoforge'])
    if (document.getElementById(i).checked)
      currentLoader = i
}

const createChart = _ => {
  window.chart = chart = new Chart({
    id: 'chart',  // 绘制图谱 dom 的 id
    type: 'force',  // 图谱类型
    data: structuredClone(chartData),  // 图谱数据
  })
  chart.init({
    core: {
      animation: true
    }
  })
}

const removeChart = _ => {
  document.getElementById('chart').innerHTML = ''
  window.chart = chart = null
}

const loadMods = async folder => {
  updateLoaderType()
  console.log(`Current Mod Loader: ${currentLoader}, start loading mods.`)
  let rootNode = root[currentLoader]
  processingFiles = []
  processingIcon = []
  modData = {}
  modData[rootNode.name] = rootNode
  modIdMapping = {}
  modIdMapping[rootNode.id] = rootNode
  imageMap = structuredClone(builtinIcons)
  let files = await tauri.fs.readDir(folder, { recursive: false })
  console.log(files)
  for (let { path, children } of files) {
    if (children) continue
    processingFiles.push(path)
    tauri.invoke('read_mod_config', { path: path })
  }
}

const loadGraph = _ => {
  console.log(modIdMapping)
  let nodes = [], links = []
  Object.values(modData).forEach(d => {
    nodes.push({
      id: d.id,
      name: d.name + '\n' + d.version,
      style: {
        size: 'normal',
        image: imageMap[d.id] ? imageMap[d.id] : imageMap.unknown,
      },
    })
    //depends
    if (d.depends) d.depends.forEach(id => {
      if (ignoreModId.indexOf(id) == -1 && modIdMapping[id]) {
        links.push({
          from: d.id,
          to: id,
          text: '强制依赖',
          directionless: false,
          style: {
            stroke: '#75F94D',
          },
        })
      }
    })
    //depends
    if (d.recommends) d.recommends.forEach(id => {
      if (ignoreModId.indexOf(id) == -1 && modIdMapping[id]) {
        links.push({
          from: d.id,
          to: id,
          text: '建议依赖',
          directionless: false,
          style: {
            stroke: '#73FBFD',
          },
        })
      }
    })
    //suggests
    if (d.suggests) d.suggests.forEach(id => {
      if (ignoreModId.indexOf(id) == -1 && modIdMapping[id]) {
        links.push({
          from: d.id,
          to: id,
          text: '联动',
          directionless: false,
          style: {
            stroke: '#808080',
          },
        })
      }
    })
    //breaks
    if (d.breaks) d.breaks.forEach(id => {
      if (ignoreModId.indexOf(id) == -1 && modIdMapping[id]) {
        links.push({
          from: d.id,
          to: id,
          text: '严重冲突',
          directionless: false,
          style: {
            stroke: '#EB3324',
          },
        })
      }
    })
    //conflicts
    if (d.conflicts) d.conflicts.forEach(id => {
      if (ignoreModId.indexOf(id) == -1 && modIdMapping[id]) {
        links.push({
          from: d.id,
          to: id,
          text: '可能冲突',
          directionless: false,
          style: {
            stroke: '#F08650',
          },
        })
      }
    })
  })
  chartData = { nodes, links }
  console.log(chartData)
  removeChart()
  createChart()
}

const openModFolder = async _ => {
  const selected = await tauri.dialog.open({
    directory: true,
    multiple: false,
    defaultPath: await tauri.path.desktopDir(),
  })
  if (!selected) return
  loadMods(selected)
}