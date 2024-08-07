import Chart from 'roc-charts'

const tauri = window.tauri = window.__TAURI__
let chart, data = {}, processingFiles = [], modData = {}, modIdMapping = {}
const ignoreModId = ['*', 'minecraft', 'fabricloader', 'java']

window.onload = _ => {
  document.getElementById("open-folder").onclick = openModFolder
  tauri.event.listen('mod-config-read', e => {
    let index = processingFiles.indexOf(e.payload.file)
    if (index == -1 || !e.payload.success) return
    processingFiles.splice(index, 1)
    try {
      let json = JSON.parse(e.payload.data)
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
  chart.style.height = (e.target.innerHeight - 70) + 'px'
  removeChart()
  createChart()
}

const createChart = _ => {
  window.chart = chart = new Chart({
    id: 'chart',  // 绘制图谱 dom 的 id
    type: 'force',  // 图谱类型
    data: data,  // 图谱数据
  })
  chart.init()
}

const removeChart = _ => {
  chart.destroy()
  window.chart = chart = null
}

const loadMods = async folder => {
  modData = {}
  modIdMapping = {}
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
    if (!d.depends) return
    Object.keys(d.depends).forEach(depend => {
      if (ignoreModId.indexOf(depend) == -1 && modIdMapping[depend]) {
        links.push({
          from: d.id,
          to: depend,
          text: '依赖于',
          directionless: false
        })
      }
    })
  })
  data = { nodes, links }
  console.log(data)
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