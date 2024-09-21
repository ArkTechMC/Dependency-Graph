import Chart from 'roc-charts'
import { configResolver, dataParser, root } from './static'
import { getBase64 } from './base64'
import { satisfies } from 'compare-versions'

const tauri = window.tauri = window.__TAURI__
let chart, chartData = {}, processingFiles = [], processingIcon = [], modData = {}, modIdMapping = {}, imageMap = {}, builtinIcons = {}, totalMods = 0
const ignoreModId = ['*', 'minecraft', 'java']
let currentLoader = 'fabric', currentDisplayMod = 'unknown'

window.onload = async _ => {
  document.getElementById("open-folder").onclick = openModFolder
  document.getElementById("export-list").onclick = exportModList
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
      updateLoadingStatus()
      tauri.invoke('read_mod_icon', { zip: f, path: data.logo }).catch(e => {
        let index = processingIcon.indexOf(f)
        if (index >= 0) processingIcon.splice(index, 1)
        console.log(e)
      })
    } catch (e) {
      console.log(e)
      updateLoadingStatus()
    }
  })
  tauri.event.listen('mod-icon-read', e => {
    let index = processingIcon.indexOf(e.payload.file)
    if (index == -1) return
    processingIcon.splice(index, 1)
    if (!e.payload.success) return
    console.log(e.payload)
    imageMap[modData[e.payload.file]?.id] = 'data:image/png;base64,' + e.payload.data
    updateLoadingStatus()
  })
  builtinIcons.forge = await getBase64('/img/forge.webp').catch(console.log)
  builtinIcons.fabricloader = await getBase64('/img/fabric.png').catch(console.log)
  builtinIcons.neoforge = await getBase64('/img/neoforge.png').catch(console.log)
  builtinIcons.unknown = await getBase64('/img/unknown.png').catch(console.log)
  imageMap = structuredClone(builtinIcons)
  fillDetail()
  createChart()
}

window.onresize = e => {
  let main = document.getElementById('main')
  // main.style.width = (e.target.innerWidth - 20) + 'px'
  main.style.height = (e.target.innerHeight - 180) + 'px'
  removeChart()
  createChart()
}

const fillDetail = _ => {
  document.getElementById('mod-logo').src = imageMap[currentDisplayMod] ?? builtinIcons.unknown
  if (modIdMapping[currentDisplayMod]) {
    let data = modIdMapping[currentDisplayMod]
    document.getElementById('mod-detail').innerHTML = `<h3>${data.name}</h3>作者：${data.authors.join(', ')}<br>${data.description ?? '暂无简介'}<br>版本：${data.version ?? '暂无版本'}`
  } else document.getElementById('mod-detail').innerHTML = ''
}

const updateLoaderType = _ => {
  for (let i of ['forge_legacy', 'forge', 'fabric', 'neoforge'])
    if (document.getElementById(i).checked)
      currentLoader = i
}

const createChart = _ => {
  Chart.changeConfig({
    text: {
      color: '#000',
      fontSize: 15,
    }
  })
  window.chart = chart = new Chart({
    id: 'chart',  // 绘制图谱 dom 的 id
    type: 'force',  // 图谱类型
    data: structuredClone(chartData),  // 图谱数据
  })
  chart.init({
    core: {
      animation: document.getElementById('animation').checked
    },
    chart: {
      force: {
        tickCount: 100
      },
    },
  })
  chart.addEventListener('click', (target) => {
    const source = target?.source;
    if (source) {
      // 通过 category 判断元素类型
      if (source.category === 'node') {
        currentDisplayMod = source.id
      } else if (source.category === 'link') {
        // 点击元素为线，source 为这条线对象
      }
    } else
      currentDisplayMod = 'unknown'
    fillDetail()
  });
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
  totalMods = 0
  imageMap = structuredClone(builtinIcons)
  let files = await tauri.fs.readDir(folder, { recursive: false })
  console.log(files)
  for (let { path, children } of files) {
    if (children) continue
    totalMods++
    processingFiles.push(path)
    updateLoadingStatus()
    tauri.invoke('read_mod_config', { path: path })
  }
}

const versionCheck = (ori, range) => {
  console.log(ori, range)
  try {
    return satisfies(ori, range)
  } catch (e) {
    console.log(e)
    return true
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
    Object.keys(d.depends ?? {}).forEach(id => {
      if (ignoreModId.indexOf(id) == -1 && modIdMapping[id] && versionCheck(modIdMapping[id].version, d.depends[id])) {
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
    Object.keys(d.recommends ?? {}).forEach(id => {
      if (ignoreModId.indexOf(id) == -1 && modIdMapping[id] && versionCheck(modIdMapping[id].version, d.depends[id])) {
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
    Object.keys(d.suggests ?? {}).forEach(id => {
      if (ignoreModId.indexOf(id) == -1 && modIdMapping[id] && versionCheck(modIdMapping[id].version, d.depends[id])) {
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
    Object.keys(d.breaks ?? {}).forEach(id => {
      if (ignoreModId.indexOf(id) == -1 && modIdMapping[id] && versionCheck(modIdMapping[id].version, d.depends[id])) {
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
    Object.keys(d.conflicts ?? {}).forEach(id => {
      if (ignoreModId.indexOf(id) == -1 && modIdMapping[id] && versionCheck(modIdMapping[id].version, d.depends[id])) {
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

const exportModList = async _ => {
  const selected = await tauri.dialog.save({
    filters: [{
      name: 'export-modlist',
      extensions: ['json']
    }]
  })
  if (!selected) return
  await tauri.fs.writeTextFile(selected, JSON.stringify(Object.values(modData).reduce((p, c) => {
    if (c.id && c.name && c.version)
      p.push({
        modid: c.id,
        name: c.name,
        version: c.version
      })
    return p
  }, []), null, '\t'))
}

const updateLoadingStatus = _ => {
  let dom = document.getElementById('loading-process')
  dom.innerHTML = `解析元数据：${totalMods - processingFiles.length}/${totalMods}<br>解析Logo：${totalMods - processingFiles.length - processingIcon.length}/${totalMods}`
  if (processingFiles.length == 0 && processingIcon.length == 0) {
    dom.innerHTML += '<br>加载完成'
    loadGraph()
  }
}