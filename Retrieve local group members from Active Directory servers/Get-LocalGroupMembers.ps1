function Get-LocalGroupMembers {
    param (
        [parameter(Mandatory = $true)][string]$Outfile,
        [parameter(Mandatory = $false)][string]$ComputerNameFilter,
        [parameter(Mandatory = $false)][string]$OUfilter
    )
    
    #Check if both ComputerNameFilter and OUfilter where used
    if ($ComputerNameFilter -and $OUfilter) {
        Write-Warning ("Both COmputerNameFilter and OUfilter were used, these can't be combined. Exiting...")
        return
    }

    #Check file extension, if it's not .csv or .xlsx exit
    if (-not ($Outfile.EndsWith('.csv') -or $Outfile.EndsWith('.xlsx'))) {
        Write-Warning ("The specified {0} output file should use the .csv or .xlsx extension, exiting..." -f $Outfile)
        return
    }
    
    #Check is ActiveDirectory module is intalled
    if (-not (Get-Module -ListAvailable | Where-Object Name -Match ActiveDirectory)) {
        Write-Warning ("ActiveDirectory PowerShell Module was not found, please install before running script...")
        return
    }

    #Retrieve all enabled computer accounts of Domain Member servers which updated their computer account the last 30 days, skip Domain Controllers

    #Using $ComputerNameFilter
    if ($ComputerNameFilter) {
        $servers = Get-ADComputer -Filter { (OperatingSystem -like 'Windows Server*') -and (PrimaryGroupID -ne '516') -and (Enabled -eq $TRUE) } -Properties LastLogonDate `
        | Where-Object Name -Match $ComputerNameFilter `
        | Where-Object LastLogonDate -gt (Get-Date).AddDays(-31) `
        | Sort-Object Name
    }

    #Using OUfilter
    if ($OUfilter) {
        $servers = Get-ADComputer -Filter { (OperatingSystem -like 'Windows Server*') -and (PrimaryGroupID -ne '516') -and (Enabled -eq $TRUE) } -Properties LastLogonDate `
        | Where-Object DistinguishedName -Match $OUfilter `
        | Where-Object LastLogonDate -gt (Get-Date).AddDays(-31) `
        | Sort-Object Name
    }

    #Without a Name or OU filter
    if (-not $OUfilter -and -not $ComputerNameFilter) {
        $servers = Get-ADComputer -Filter { (OperatingSystem -like 'Windows Server*') -and (PrimaryGroupID -ne '516') -and (Enabled -eq $TRUE) } -Properties LastLogonDate -ErrorAction Stop `
        | Where-Object LastLogonDate -gt (Get-Date).AddDays(-31) `
        | Sort-Object Name
    }

    #Exit if no computer accounts were found
    if ($servers.count -eq 0) {
        Write-Warning ("No Computer Accounts were found, check access or filters. Exiting...")
        return
    }

    $total = foreach ($server in $servers) {
    
        #Retrieve all local groups on the server and their members
        try {
            $groupmembers = Get-CimInstance -ClassName Win32_GroupUser -ComputerName $server.name -ErrorAction Stop | Where-Object GroupComponent -Match $server.Name
            Write-Host ("`nRetrieving local groups and their members on server {0}" -f $server.name) -ForeGroundColor Green    
        }
        catch {
            Write-Warning ("Could not connect to {0}, skipping..." -f $server.Name)
            Continue
        }
    
        #Loop through all groupmembers and add them to the $total variable
        foreach ($member in $groupmembers) {
            Write-Host ("[{0}] Adding {1} from domain or server {2} which is member of the local group '{3}'" -f $member.PSComputerName, $member.PartComponent.Name, $member.PartComponent.Domain, $member.GroupComponent.Name) -ForegroundColor Green
            [PSCustomObject]@{
                Server = $member.PSComputerName
                Group  = $member.GroupComponent.Name
                Domain = $member.PartComponent.Domain
                Member = $member.PartComponent.Name
            }
        }
    }

    #Output to report is resuls where found
    if ($total.count -gt 0) {
        #Export results to either CSV of XLSX, install ImportExcel module if needed
        if ($Outfile.EndsWith('.csv')) {
            try {
                New-Item -Path $Outfile -ItemType File -Force:$true -Confirm:$false -ErrorAction Stop | Out-Null
                $total | Sort-Object Server, Group, User | Export-Csv -Path $Outfile -Encoding UTF8 -Delimiter ';' -NoTypeInformation
                Write-Host ("`nExported results to {0}" -f $Outfile) -ForegroundColor Green
            }
            catch {
                Write-Warning ("`nCould not export results to {0}, check path and permissions" -f $Outfile)
            }
        }

        if ($Outfile.EndsWith('.xlsx')) {
            try {
                #Test path and remove empty file afterwards because xlsx is corrupted if not
                New-Item -Path $Outfile -ItemType File -Force:$true -Confirm:$false -ErrorAction Stop | Out-Null
                Remove-Item -Path $Outfile -Force:$true -Confirm:$false | Out-Null
            
                #Install ImportExcel module if needed
                if (-not (Get-Module -ListAvailable | Where-Object Name -Match ImportExcel)) {
                    Write-Warning ("`nImportExcel PowerShell Module was not found, installing...")
                    Install-Module ImportExcel -Scope CurrentUser -Force:$true
                    Import-Module ImportExcel
                }

                $total | Sort-Object Server, Group, User | Export-Excel -AutoSize -BoldTopRow -FreezeTopRow -AutoFilter -Path $Outfile
                Write-Host ("`nExported results to {0}" -f $Outfile) -ForegroundColor Green
            }
            catch {
                Write-Warning ("`nCould not export results to {0}, check path and permissions" -f $Outfile)
            }
        }
    }
    else {
        Write-Warning ("Could not find any members, please check acces or filter...")
    }
}