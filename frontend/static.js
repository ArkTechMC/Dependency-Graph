import { load } from 'js-toml'

export const root = {
    forge: {
        id: 'forge',
        name: "Minecraft Forge",
        version: ''
    },
    fabric: {
        id: 'fabricloader',
        name: "Fabric Loader",
        version: ''
    },
    neoforge: {
        id: 'neoforge',
        name: "Neoforge",
        version: ''
    },
}

export const dataParser = {
    forge: s => load(s.forge_data),
    fabric: s => JSON.parse(s.fabric_data),
    neoforge: s => load(s.neoforge_data),
}

export const configResolver = {
    forge: obj => {
        let mod = obj.mods[0], depends = obj.dependencies?.[mod.modId]
        return {
            id: mod.modId,
            name: mod.displayName,
            version: mod.version,
            logo: obj.logoFile ?? obj.modproperties?.[mod.modId].catalogueImageIcon,
            depends: depends.filter(x => x.mandatory).map(x => x.modId),
            recommends: depends.filter(x => !x.mandatory).map(x => x.modId),
        }
    },
    fabric: obj => {
        return {
            id: obj.id,
            name: obj.name,
            version: obj.version,
            logo: obj.icon,
            depends: Object.keys(obj.depends ?? {}),
            recommends: Object.keys(obj.recommends ?? {}),
            suggests: Object.keys(obj.suggests ?? {}),
            breaks: Object.keys(obj.breaks ?? {}),
            conflicts: Object.keys(obj.conflicts ?? {}),
        }
    },
    neoforge: obj => {
        let mod = obj.mods[0], depends = obj.dependencies[mod.modId]
        return {
            id: mod.modId,
            name: mod.displayName,
            version: mod.version,
            logo: mod.logoFile,
            depends: depends.filter(x => !x.type || x.type.toLowerCase() == 'required').map(x => x.modId),
            recommends: depends.filter(x => x.type.toLowerCase() == 'optional').map(x => x.modId),
            breaks: depends.filter(x => x.type.toLowerCase() == 'incompatible').map(x => x.modId),
            conflicts: depends.filter(x => x.type.toLowerCase() == 'discouraged').map(x => x.modId),
        }
    },
}