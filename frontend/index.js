import Chart from 'roc-charts'

const tauri = window.tauri = window.__TAURI__
let chart, chartData = {}, processingFiles = [], modData = {}, modIdMapping = {}
const ignoreModId = ['*', 'minecraft', 'java']

window.onload = _ => {
  document.getElementById("open-folder").onclick = openModFolder
  tauri.event.listen('mod-config-read', e => {
    let index = processingFiles.indexOf(e.payload.file)
    if (index == -1 || !e.payload.success) return
    processingFiles.splice(index, 1)
    console.log(e.payload)
    try {
      let json = JSON.parse(e.payload.fabric_data)
      modIdMapping[json.id] = modData[e.payload.file] = json
    } catch (e) {
      console.log(e)
    }
    if (processingFiles.length == 0) loadGraph()
  })
  createChart()
}

window.onresize = e => {
  let chart = document.getElementById('chart')
  chart.style.width = (e.target.innerWidth - 20) + 'px'
  chart.style.height = (e.target.innerHeight - 180) + 'px'
  removeChart()
  createChart()
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
  let fabricLoader = {
    id: 'fabricloader',
    name: "Fabric Loader",
    version: ''
  }
  modData = { FabricLoader: fabricLoader }
  modIdMapping = { fabricloader: fabricLoader }
  let files = await tauri.fs.readDir(folder, { recursive: false })
  console.log(files)
  for (let { path, children } of files) {
    if (children) continue
    processingFiles.push(path)
    tauri.invoke('read_mod_config', { path: path })
  }
}

const loadGraph = _ => {
  let nodes = [], links = []
  Object.values(modData).forEach(d => {
    nodes.push({
      id: d.id,
      name: d.name + '\n' + d.version,
      style: {
        size: 'normal'
      }
    })
    //depends
    if (d.depends) Object.keys(d.depends).forEach(id => {
      if (ignoreModId.indexOf(id) == -1 && modIdMapping[id]) {
        links.push({
          from: d.id,
          to: id,
          text: '强制依赖',
          directionless: false
        })
      }
    })
    //depends
    if (d.recommends) Object.keys(d.recommends).forEach(id => {
      if (ignoreModId.indexOf(id) == -1 && modIdMapping[id]) {
        links.push({
          from: d.id,
          to: id,
          text: '建议依赖',
          directionless: false
        })
      }
    })
    //suggests
    if (d.suggests) Object.keys(d.suggests).forEach(id => {
      if (ignoreModId.indexOf(id) == -1 && modIdMapping[id]) {
        links.push({
          from: d.id,
          to: id,
          text: '联动',
          directionless: false
        })
      }
    })
    //breaks
    if (d.breaks) Object.keys(d.breaks).forEach(id => {
      if (ignoreModId.indexOf(id) == -1 && modIdMapping[id]) {
        links.push({
          from: d.id,
          to: id,
          text: '严重冲突',
          directionless: false
        })
      }
    })
    //conflicts
    if (d.conflicts) Object.keys(d.conflicts).forEach(id => {
      if (ignoreModId.indexOf(id) == -1 && modIdMapping[id]) {
        links.push({
          from: d.id,
          to: id,
          text: '可能冲突',
          directionless: false
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
    defaultPath: await tauri.path.appDir(),
  })
  if (!selected) return
  loadMods(selected)
}