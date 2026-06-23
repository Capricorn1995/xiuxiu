; 嗅嗅 NSIS 中文安装界面定制

!macro customInstallMode
  MessageBox MB_YESNO "是否为所有用户安装嗅嗅？$\n$\n选择「是」安装到所有用户（需要管理员权限）$\n选择「否」仅安装到当前用户" IDNO currentUser
    SetShellVarContext all
    Goto done
  currentUser:
    SetShellVarContext current
  done:
!macroend
