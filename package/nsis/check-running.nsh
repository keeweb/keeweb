!macro EnsureAppIsNotRunning
  Var /GLOBAL retryNumEnsureAppIsNotRunning
  ${For} $retryNumEnsureAppIsNotRunning 0 1000
    DetailPrint "Checking if ${PRODUCT_EXE} is running..."
    nsExec::ExecToStack /OEM 'tasklist /NH /FI "IMAGENAME eq ${PRODUCT_EXE}"'
    Pop $0
    ${If} $0 != 0
      DetailPrint "Error checking ${PRODUCT_EXE}: $0"
      MessageBox MB_ICONSTOP|MB_OK "Failed to check whether process is running" /SD IDOK
      Quit
    ${EndIf}
    Pop $1
    ${StrStr} $0 $1 "${PRODUCT_EXE}"
    ${If} $0 == ""
      DetailPrint "${PRODUCT_EXE} is not running"
      ${ExitFor}
    ${Else}
      ${If} $isUpdaterMode == 1
      ${AndIf} $retryNumEnsureAppIsNotRunning < 5
        DetailPrint "${PRODUCT_EXE} is running, waiting..."
        Sleep 1000
      ${Else}
        MessageBox MB_ICONQUESTION|MB_OKCANCEL|MB_DEFBUTTON1 "To proceed, please close ${PRODUCT_NAME} and click OK" /SD IDCANCEL IDOK ok
        Quit
        ok:
      ${EndIf}
    ${EndIf}
  ${Next}
!macroend
