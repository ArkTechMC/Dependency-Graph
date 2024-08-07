// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::File;
use std::io::BufRead;
use std::io::BufReader;
use std::io::Lines;
use std::io::Read;
use std::io::Result;
use tauri::Manager;
use zip::ZipArchive;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![read_mod_config])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn read_file_by_line<File>(file: File) -> Result<Lines<BufReader<File>>>where File: Read{
    Ok(BufReader::new(file).lines())
}

#[derive(Clone, serde::Serialize)]
struct Payload {
    success: bool,
    file: String,
    forge_data: String,
    fabric_data: String,
    neoforge_data: String,
}

#[tauri::command]
//Dont delete this async, or software will no response
async fn read_mod_config(path: String, app: tauri::AppHandle) {
    let path_ptr = &path;
    let mut forge_data = String::new();
    let mut fabric_data = String::new();
    let mut neoforge_data = String::new();
    if let Ok(zipfile) = File::open(path_ptr) {
        let mut zip = ZipArchive::new(zipfile).unwrap();
        //Forge
        if let Ok(forge_config) = zip.by_name("META-INF\\mods.toml") {
            if let Ok(lines) = read_file_by_line(forge_config) {
                for line in lines {
                    if let Ok(ip) = line {
                        println!("{}", ip);
                        forge_data.push_str(&ip);
                        forge_data.push_str("\n");
                    }      
                }   
            }
        };
        //Fabric
        if let Ok(fabric_config) = zip.by_name("fabric.mod.json") {
            if let Ok(lines) = read_file_by_line(fabric_config) {
                for line in lines {
                    if let Ok(ip) = line {
                        println!("{}", ip);
                        fabric_data.push_str(&ip);
                        fabric_data.push_str("\n");
                    }      
                }   
            }
        };
        //Neoforge
        if let Ok(neoforge_config) = zip.by_name("META-INF\\neoforge.mods.toml") {
            if let Ok(lines) = read_file_by_line(neoforge_config) {
                for line in lines {
                    if let Ok(ip) = line {
                        println!("{}", ip);
                        neoforge_data.push_str(&ip);
                        neoforge_data.push_str("\n");
                    }      
                }   
            }
        };
    }
    let _ =app.emit_all("mod-config-read", Payload { 
        success: true,
        file: (&path_ptr).to_string(), 
        forge_data: forge_data,
        fabric_data: fabric_data,
        neoforge_data: neoforge_data
    });
}
