!macro customInstall
  # Ensure Start Menu directory exists
  CreateDirectory "$SMPROGRAMS\${MENU_FILENAME}"
  
  # Ensure application shortcut is placed in Start Menu folder
  CreateShortCut "$SMPROGRAMS\${MENU_FILENAME}\${SHORTCUT_NAME}.lnk" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
  WinShell::SetLnkAUMI "$SMPROGRAMS\${MENU_FILENAME}\${SHORTCUT_NAME}.lnk" "${APP_ID}"
  
  # Create uninstaller shortcut in Start Menu folder
  CreateShortCut "$SMPROGRAMS\${MENU_FILENAME}\Uninstall ${SHORTCUT_NAME}.lnk" "$INSTDIR\${UNINSTALL_FILENAME}" "" "$INSTDIR\${UNINSTALL_FILENAME}" 0 "" "" "Uninstall ${PRODUCT_NAME}"
  
  # Clean up any obsolete loose shortcut in root Programs folder
  ${if} ${FileExists} "$SMPROGRAMS\${SHORTCUT_NAME}.lnk"
    Delete "$SMPROGRAMS\${SHORTCUT_NAME}.lnk"
  ${endif}
  
  # Refresh shell icon cache
  System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
!macroend

!macro customUnInstall
  # Remove Start Menu shortcuts and directory
  Delete "$SMPROGRAMS\${MENU_FILENAME}\Uninstall ${SHORTCUT_NAME}.lnk"
  Delete "$SMPROGRAMS\${MENU_FILENAME}\${SHORTCUT_NAME}.lnk"
  RMDir "$SMPROGRAMS\${MENU_FILENAME}"
  
  System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
!macroend
