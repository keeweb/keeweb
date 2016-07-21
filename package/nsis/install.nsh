Function .onInit
  ${If} ${RunningX64}
    ${If} ${arch} == "x64"
      SetRegView 64
      StrCpy $InstDir "$PROGRAMFILES64\KeeWeb"
    ${Else}
      MessageBox MB_ICONSTOP|MB_OK "Please use 64-bit installer on 64-bit system"
      Quit
    ${EndIf}
  ${Else}
    ${If} ${arch} == "x64"
      MessageBox MB_ICONSTOP|MB_OK "Please use 32-bit installer on 32-bit system"
      Quit
    ${EndIf}
  ${EndIf}

  ${IfNot} ${AtLeastWin7}
    MessageBox MB_ICONSTOP|MB_OK "Windows 7 and above required"
    Quit
  ${EndIf}

  System::Call 'kernel32::CreateMutex(i 0, i 0, t "KeeWeb-Installer-Mutex-8843DCD0") ?e'
  Pop $R0
  ${If} $R0 != 0
    MessageBox MB_ICONSTOP|MB_OK "The installer is already running."
    Abort
  ${EndIf}

  !insertmacro MULTIUSER_INIT
FunctionEnd

Section "MainSection" SEC01
  !insertmacro EnsureAppIsNotRunning

  ReadRegStr $R0 ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "UninstallString"
  ${If} $R0 != ""
    ExecWait '$R0 /S _?=$INSTDIR'
  ${EndIf}

  ReadRegStr $R0 "HKCU" "${PRODUCT_UNINST_KEY}" "QuietUninstallString"
  ${If} $R0 != ""
    ExecWait '$R0'
  ${EndIf}

  ReadRegStr $R0 "HKCU" "${PRODUCT_UNINST_KEY}" "UninstallString"
  ${If} $R0 != ""
    ExecWait '$R0'
  ${EndIf}

  SetOutPath "$INSTDIR"
  SetOverwrite ifnewer
  File /r "tmp\desktop\KeeWeb-win32-${arch}\*"
  CreateDirectory "$SMPROGRAMS\KeeWeb"
  CreateShortCut "$SMPROGRAMS\KeeWeb\KeeWeb.lnk" "$INSTDIR\KeeWeb.exe"
  CreateShortCut "$DESKTOP\KeeWeb.lnk" "$INSTDIR\KeeWeb.exe"

  !insertmacro APP_ASSOCIATE "kdbx" "kdbxfile" "KeePass Password Database" \
    "$INSTDIR\KeeWeb.exe,0" "Open with KeeWeb" "$INSTDIR\KeeWeb.exe $\"%1$\""
  !insertmacro UPDATEFILEASSOC
SectionEnd

Section -Post
  WriteUninstaller "$INSTDIR\uninst.exe"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayName" "$(^Name)"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "UninstallString" '"$INSTDIR\uninst.exe"'
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "QuietUninstallString" '"$INSTDIR\uninst.exe" /S'
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayIcon" "$INSTDIR\KeeWeb.exe"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
SectionEnd
