; Create desktop shortcut after installation
!macro NSIS_HOOK_POSTINSTALL
  CreateShortcut "$DESKTOP\Painting Box.lnk" "$INSTDIR\Painting Box.exe"
!macroend

; Remove desktop shortcut on uninstall
!macro NSIS_HOOK_POSTUNINSTALL
  Delete "$DESKTOP\Painting Box.lnk"
!macroend
