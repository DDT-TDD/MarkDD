!macro NSIS_HOOK_PREINIT
    StrCpy $INSTDIR "$LOCALAPPDATA\Programs\markdd-editor"
!macroend

!macro NSIS_HOOK_POSTINIT
    StrCpy $INSTDIR "$LOCALAPPDATA\Programs\markdd-editor"
!macroend

!macro NSIS_HOOK_PREINSTALL
    StrCpy $INSTDIR "$LOCALAPPDATA\Programs\markdd-editor"
!macroend

!macro NSIS_HOOK_POSTINSTALL
    !insertmacro APP_ASSOCIATE "md" "MarkDD.MarkdownFile" "Markdown Document" "$INSTDIR\markdd-editor.exe,0" "Open with MarkDD Editor" "$INSTDIR\markdd-editor.exe $\"%1$\""
    !insertmacro APP_ASSOCIATE "markdown" "MarkDD.MarkdownFile" "Markdown Document" "$INSTDIR\markdd-editor.exe,0" "Open with MarkDD Editor" "$INSTDIR\markdd-editor.exe $\"%1$\""
    !insertmacro APP_ASSOCIATE "mdown" "MarkDD.MarkdownFile" "Markdown Document" "$INSTDIR\markdd-editor.exe,0" "Open with MarkDD Editor" "$INSTDIR\markdd-editor.exe $\"%1$\""
    !insertmacro APP_ASSOCIATE "mdwn" "MarkDD.MarkdownFile" "Markdown Document" "$INSTDIR\markdd-editor.exe,0" "Open with MarkDD Editor" "$INSTDIR\markdd-editor.exe $\"%1$\""
    !insertmacro APP_ASSOCIATE "mkd" "MarkDD.MarkdownFile" "Markdown Document" "$INSTDIR\markdd-editor.exe,0" "Open with MarkDD Editor" "$INSTDIR\markdd-editor.exe $\"%1$\""
    !insertmacro UPDATEFILEASSOC
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
    !insertmacro APP_UNASSOCIATE "md" "MarkDD.MarkdownFile"
    !insertmacro APP_UNASSOCIATE "markdown" "MarkDD.MarkdownFile"
    !insertmacro APP_UNASSOCIATE "mdown" "MarkDD.MarkdownFile"
    !insertmacro APP_UNASSOCIATE "mdwn" "MarkDD.MarkdownFile"
    !insertmacro APP_UNASSOCIATE "mkd" "MarkDD.MarkdownFile"
    !insertmacro UPDATEFILEASSOC
!macroend
