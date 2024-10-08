import { load } from 'js-toml'

export const root = {
    forge_legacy: {
        id: 'forge',
        name: "Minecraft Forge",
        version: ''
    },
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
    forge_legacy: s => JSON.parse(s.forge_legacy_data),
    forge: s => load(s.forge_data),
    fabric: s => JSON.parse(s.fabric_data),
    neoforge: s => load(s.neoforge_data),
}

export const configResolver = {
    forge_legacy: obj => {
        let mod = obj?.[0] ?? {}
        return {
            id: mod.modid,
            name: mod.name,
            version: mod.version,
            authors: mod.authorList,
            description: mod.description,
            logo: mod.logoFile,
            depends: mod.dependencies.reduce((p, c) => { p[c] = '*'; return p }, {}),
        }
    },
    forge: obj => {
        let mod = obj?.mods?.[0] ?? {}, depends = obj?.dependencies?.[mod.modId] ?? {}
        return {
            id: mod.modId,
            name: mod.displayName,
            version: mod.version,
            authors: mod.authors.split(', '),
            description: obj.description ?? mod.description,
            logo: obj.logoFile ?? obj.modproperties?.[mod.modId].catalogueImageIcon,
            depends: depends.filter(x => x.mandatory).map(x => x.modId).reduce((p, c) => { p[c] = '*'; return p }, {}),//Forge not support version check.
            recommends: depends.filter(x => !x.mandatory).map(x => x.modId).reduce((p, c) => { p[c] = '*'; return p }, {}),
        }
    },
    fabric: obj => {
        obj = obj ?? {}
        return {
            id: obj.id,
            name: obj.name,
            version: obj.version,
            authors: obj.authors.map(x => x.name ?? x),
            description: obj.description,
            logo: obj.icon,
            depends: obj.depends ?? {},
            recommends: obj.recommends ?? {},
            suggests: obj.suggests ?? {},
            breaks: obj.breaks ?? {},
            conflicts: obj.conflicts ?? {},
        }
    },
    neoforge: obj => {
        let mod = obj?.mods?.[0] ?? {}, depends = obj?.dependencies?.[mod.modId] ?? {}
        return {
            id: mod.modId,
            name: mod.displayName,
            version: mod.version,
            authors: mod.authors.split(', '),
            logo: mod.logoFile,
            description: obj.description ?? mod.description,
            depends: depends.filter(x => !x.type || x.type.toLowerCase() == 'required').map(x => x.modId).reduce((p, c) => { p[c] = '*'; return p }, {}),//Forge not support version check.,
            recommends: depends.filter(x => x.type.toLowerCase() == 'optional').map(x => x.modId).reduce((p, c) => { p[c] = '*'; return p }, {}),
            breaks: depends.filter(x => x.type.toLowerCase() == 'incompatible').map(x => x.modId).reduce((p, c) => { p[c] = '*'; return p }, {}),
            conflicts: depends.filter(x => x.type.toLowerCase() == 'discouraged').map(x => x.modId).reduce((p, c) => { p[c] = '*'; return p }, {}),
        }
    },
}