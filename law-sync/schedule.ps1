param([ValidateSet("Daily","Logon")] [string]$When="Daily")
$pythonPath = (Get-Command python -ErrorAction Stop).Source
$scriptPath = Join-Path $PSScriptRoot "check.py"
$action = New-ScheduledTaskAction -Execute $pythonPath -Argument ('"' + $scriptPath + '"') -WorkingDirectory $PSScriptRoot
$trigger = if ($When -eq "Daily") { New-ScheduledTaskTrigger -Daily -At "19:00" } else { New-ScheduledTaskTrigger -AtLogOn -User ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) }
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName "RussiaOnline-LawSync" -Action $action -Trigger $trigger -Settings $settings -Description "Локальная проверка законодательства Россия Онлайн" -Force
