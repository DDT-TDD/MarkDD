use std::process::Command;
use std::sync::Mutex;
use std::process::Child;
use tauri::Manager;

static NODE_CHILD: Mutex<Option<Child>> = Mutex::new(None);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .setup(|app| {
            #[cfg(target_os = "windows")]
            {
                println!("[Tauri Rust] Killing any zombie backend processes on port 3001...");
                use std::os::windows::process::CommandExt;
                let _ = Command::new("cmd")
                    .args(&["/C", "for /f \"tokens=5\" %a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do taskkill /f /pid %a"])
                    .creation_flags(0x08000000) // CREATE_NO_WINDOW
                    .status();
            }

            println!("[Tauri Rust] Resolving backend path...");

            // Resolution order:
            // 1. <exe_dir>/resources/src/main/main-tauri.js  (production NSIS install)
            // 2. Tauri's resource_dir / resources/src/main/main-tauri.js  (Tauri resource bundle)
            // 3. Cargo workspace root dev path via CARGO_MANIFEST_DIR  (cargo run / tauri dev)
            let mut resolved_path = std::path::PathBuf::new();

            // 1. Relative to the executable (production layout)
            if let Ok(exe) = std::env::current_exe() {
                if let Some(exe_dir) = exe.parent() {
                    let candidate = exe_dir.join("resources").join("src").join("main").join("main-tauri.js");
                    if candidate.exists() {
                        resolved_path = candidate;
                    }
                }
            }

            // 2. Tauri resource_dir (handles both production bundle and `tauri dev`)
            if !resolved_path.exists() {
                if let Ok(res_dir) = app.path().resource_dir() {
                    let candidate = res_dir.join("resources").join("src").join("main").join("main-tauri.js");
                    if candidate.exists() {
                        resolved_path = candidate;
                    }
                }
            }

            // 3. Development fallback: workspace root relative to Cargo.toml
            //    CARGO_MANIFEST_DIR is set at compile-time, so we embed it as a string literal.
            if !resolved_path.exists() {
                let dev_candidate = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                    .parent()
                    .unwrap()
                    .join("resources")
                    .join("src")
                    .join("main")
                    .join("main-tauri.js");
                if dev_candidate.exists() {
                    resolved_path = dev_candidate;
                }
            }

            if !resolved_path.exists() {
                eprintln!(
                    "[Tauri Rust] ERROR: Could not locate main-tauri.js. \
                     Run scripts/prepare-resources.ps1 first, then retry."
                );
                // Return Ok so the window still opens and shows an error UI
                return Ok(());
            }

            println!("[Tauri Rust] Spawning Node.js backend from: {:?}", resolved_path);

            // Determine the working directory: the directory that contains
            // package.json so that relative require() calls resolve correctly.
            let work_dir = resolved_path
                .parent()          // main/
                .and_then(|p| p.parent())  // src/
                .and_then(|p| p.parent())  // resources/ (contains package.json)
                .map(|p| p.to_path_buf());

            let mut cmd = Command::new("node");
            cmd.arg(&resolved_path);
            
            // Forward CLI arguments (e.g. double-clicked file path from file association) to Node.js backend
            for arg in std::env::args().skip(1) {
                if !arg.starts_with("--") {
                    cmd.arg(&arg);
                }
            }
            if let Some(ref wd) = work_dir {
                cmd.current_dir(wd);
            }
            #[cfg(target_os = "windows")]
            {
                use std::os::windows::process::CommandExt;
                cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
            }

            match cmd.spawn() {
                Ok(child) => {
                    println!("[Tauri Rust] Node.js backend spawned asynchronously. Tauri window loading.");
                    if let Ok(mut guard) = NODE_CHILD.lock() {
                        *guard = Some(child);
                    }
                }
                Err(e) => {
                    eprintln!(
                        "[Tauri Rust] Failed to start Node.js backend. \
                         Make sure 'node' is installed and in PATH. Error: {}",
                        e
                    );
                }
            }

            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            println!("[Tauri Single Instance] Second instance launched with args: {:?}", argv);
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }

            let mut target_file = None;
            for arg in argv.iter().skip(1) {
                if !arg.starts_with("--") && !arg.ends_with(".exe") {
                    let p = std::path::Path::new(arg);
                    if p.exists() && p.is_file() {
                        target_file = Some(arg.clone());
                        break;
                    }
                }
            }

            if let Some(file_path) = target_file {
                println!("[Tauri Single Instance] Forwarding file path to backend: {}", file_path);
                let payload = serde_json::json!({ "filePath": file_path });
                let payload_str = payload.to_string();
                let req = format!(
                    "POST /open-file-instance HTTP/1.1\r\nHost: localhost:3001\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                    payload_str.len(),
                    payload_str
                );
                if let Ok(mut stream) = std::net::TcpStream::connect("127.0.0.1:3001") {
                    use std::io::Write;
                    let _ = stream.write_all(req.as_bytes());
                }
            }
        }))
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(move |_app_handle, event| {
        if let tauri::RunEvent::Exit = event {
            println!("[Tauri Rust] Application exit event received. Terminating Node.js backend...");
            if let Ok(mut guard) = NODE_CHILD.lock() {
                if let Some(mut child) = guard.take() {
                    let _ = child.kill();
                    println!("[Tauri Rust] Node.js backend terminated.");
                }
            }
        }
    });
}
