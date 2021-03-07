!include package\nsis\defines.nsh
!include package\nsis\variables.nsh
!include package\nsis\includes.nsh
!include package\nsis\check-running.nsh

!insertmacro MUI_PAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

Function .onInit
  ${If} ${IsNativeAMD64}
    SetRegView 64
    StrCpy $InstDir "$PROGRAMFILES64\${PRODUCT_NAME}"
  ${EndIf}

  ${If} ${IsNativeARM64}
    StrCpy $InstDir "$PROGRAMFILES64\${PRODUCT_NAME}"
  ${EndIf}

  !insertmacro MULTIUSER_INIT

  ${StrStr} $0 "$EXEPATH" "${PRODUCT_UNINST_TEMP_EXE}"
  ${If} $0 == ""
    MessageBox MB_ICONQUESTION|MB_YESNO|MB_DEFBUTTON2 "Remove $(^Name) from your computer?" /SD IDYES IDYES yes
    Abort
    yes:
    !insertmacro EnsureAppIsNotRunning

    SetOverwrite on
    CopyFiles "$EXEPATH" "$TEMP\${PRODUCT_UNINST_TEMP_EXE}"
    ${If} ${Silent}
      Exec '"$TEMP\${PRODUCT_UNINST_TEMP_EXE}" /S'
    ${Else}
      Exec '"$TEMP\${PRODUCT_UNINST_TEMP_EXE}"'
    ${EndIf}
    Quit
  ${EndIf}
FunctionEnd

Function .onInstSuccess
  HideWindow
  MessageBox MB_ICONINFORMATION|MB_OK "$(^Name) was successfully removed from your computer." /SD IDOK
FunctionEnd

Section "MainSection" SEC01
  !insertmacro EnsureAppIsNotRunning

  DetailPrint "Removing desktop shortcut"
  Delete "$DESKTOP\KeeWeb.lnk"
  DetailPrint "Removing menu shortcut"
  Delete "$SMPROGRAMS\KeeWeb\KeeWeb.lnk"

  DetailPrint "Removing menu items"
  RMDir "$SMPROGRAMS\KeeWeb"

  ReadRegStr $R0 ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "InstallDir"
  ${If} $R0 == ""
    DetailPrint "InstallDir key is absent"
    Abort
  ${EndIf}
  StrCpy $InstDir "$R0"

  ClearErrors
  DetailPrint "Removing app files from $InstDir"
  Var /GLOBAL deleteRetry
  ${ForEach} $deleteRetry 1 3 + 1
    RMDir /r "$InstDir"
    ${If} ${Errors}
      ClearErrors
      DetailPrint "Error removing files, retrying in a second"
      Sleep 1000
    ${Else}
      ${ExitFor}
    ${EndIf}
  ${Next}

  DetailPrint "Deleting registry keys"
  DeleteRegKey ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}"

  DetailPrint "Unregistering file associations"
  !insertmacro APP_UNASSOCIATE "kdbx" "kdbxfile"
  DetailPrint "Updating file associations"
  !insertmacro UPDATEFILEASSOC

  DetailPrint "Done"
  SetAutoClose true
SectionEnd
