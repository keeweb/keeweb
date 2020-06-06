!include package\nsis\defines.nsh
!include package\nsis\includes.nsh
!include package\nsis\check-running.nsh

!define MUI_FINISHPAGE_SHOWREADME ""
!define MUI_FINISHPAGE_SHOWREADME_NOTCHECKED
!define MUI_FINISHPAGE_SHOWREADME_TEXT "Create a Shortcut on Desktop"
!define MUI_FINISHPAGE_SHOWREADME_FUNCTION FinishPageCheckboxCheckedAction

!insertmacro MUI_PAGE_WELCOME
#!insertmacro MULTIUSER_PAGE_INSTALLMODE
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_LANGUAGE "English"

Function .onInit
  ${If} ${IsNativeAMD64}
    ${If} ${arch} != "x64"
      MessageBox MB_ICONSTOP|MB_OK "Please use a 64-bit installer on a 64-bit system"
      Quit
    ${EndIf}
    SetRegView 64
    StrCpy $InstDir "$PROGRAMFILES64\${PRODUCT_NAME}"
  ${EndIf}

  ${If} ${IsNativeARM64}
    ${If} ${arch} != "arm64"
      MessageBox MB_ICONSTOP|MB_OK "Please use an ARM64 installer on an ARM64 system"
      Quit
    ${EndIf}
    StrCpy $InstDir "$PROGRAMFILES64\${PRODUCT_NAME}"
  ${EndIf}

  ${If} ${IsNativeIA32}
    ${If} ${arch} != "ia32"
      MessageBox MB_ICONSTOP|MB_OK "Please use a 32-bit installer on a 32-bit system"
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

Function FinishPageCheckboxCheckedAction
  CreateShortCut "$DESKTOP\KeeWeb.lnk" "$INSTDIR\${PRODUCT_EXE}"
FunctionEnd

Section "MainSection" SEC01
  !insertmacro EnsureAppIsNotRunning

  SetOverwrite on

  ReadRegStr $R0 ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "UninstallString"
  ${If} $R0 != ""
    CopyFiles "$R0" "$TEMP\${PRODUCT_UNINST_TEMP_EXE}"
    ExecWait '"$TEMP\${PRODUCT_UNINST_TEMP_EXE}" /S'
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
  SetOverwrite on
  File /r "tmp\desktop\KeeWeb-win32-${arch}\*"
  Delete "$INSTDIR\resources\app\*.*"
  RMDir /r "$INSTDIR\resources\app"
  CreateDirectory "$SMPROGRAMS\KeeWeb"
  CreateShortCut "$SMPROGRAMS\KeeWeb\KeeWeb.lnk" "$INSTDIR\${PRODUCT_EXE}"

  !insertmacro APP_ASSOCIATE "kdbx" "kdbxfile" "KeePass Password Database" \
    "$INSTDIR\${PRODUCT_EXE},0" "Open with KeeWeb" "$INSTDIR\${PRODUCT_EXE} $\"%1$\""
  !insertmacro UPDATEFILEASSOC
SectionEnd

Section -Post
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayName" "$(^Name)"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "UninstallString" '"$INSTDIR\uninst.exe"'
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "QuietUninstallString" '"$INSTDIR\uninst.exe" /S'
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayIcon" "$INSTDIR\${PRODUCT_EXE}"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "InstallDir" "$INSTDIR"
SectionEnd
