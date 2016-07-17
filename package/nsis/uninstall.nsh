Function un.onInit
  MessageBox MB_ICONQUESTION|MB_YESNO|MB_DEFBUTTON2 "Remove $(^Name) from your computer?" /SD IDYES IDYES yes
  Abort
  yes:
  ${If} ${RunningX64}
    SetRegView 64
  ${EndIf}
  !insertmacro MULTIUSER_UNINIT
FunctionEnd

Function un.onUninstSuccess
  HideWindow
  MessageBox MB_ICONINFORMATION|MB_OK "$(^Name) was successfully removed from your computer." /SD IDOK
FunctionEnd

Section Uninstall
  Delete "$DESKTOP\KeeWeb.lnk"
  Delete "$SMPROGRAMS\KeeWeb\KeeWeb.lnk"

  RMDir "$SMPROGRAMS\KeeWeb"
  RMDir /r "$INSTDIR"

  DeleteRegKey ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}"

  !insertmacro APP_UNASSOCIATE "kdbx" "kdbxfile"
  !insertmacro UPDATEFILEASSOC

  SetAutoClose true
SectionEnd
