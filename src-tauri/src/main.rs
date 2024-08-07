// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::File;
use std::path::Path;
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
    data: String,
}

#[tauri::command]
//Dont delete this async, or software will no response
async fn read_mod_config(path: String, app: tauri::AppHandle) {
    let path_ptr = &path;
    if let Ok(zipfile) = File::open(path_ptr) {
        let mut zip = ZipArchive::new(zipfile).unwrap();
        for i in 0..zip.len() {
            let file = zip.by_index(i).unwrap();
            if file.sanitized_name().as_path() == Path::new("fabric.mod.json") {
                if let Ok(lines) = read_file_by_line(file) {
                    let mut s = String::new();
                    for line in lines {
                        if let Ok(ip) = line {
                            println!("{}", ip);
                            s.push_str(&ip);
                            s.push_str("\n");
                        }      
                    }   
                    let _ =app.emit_all("mod-config-read", Payload { success: true, file: (&path_ptr).to_string(), data: s });
                }
            }
        }
    } else {
        let _ =app.emit_all("mod-config-read", Payload { success: false, file: (&path_ptr).to_string(), data: "".to_string() });
    }
}
