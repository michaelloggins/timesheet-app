# ============================================================
# Create Entra ID Security Groups for MiraVista Timesheet System
# ============================================================
# Run this script with Azure AD admin permissions
# Requires: AzureAD or Microsoft.Graph PowerShell module
# ============================================================

# Connect to Azure AD (uncomment the one you need)
# Connect-AzureAD
# Connect-MgGraph -Scopes "Group.ReadWrite.All"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Creating Entra ID Security Groups for MiraVista Timesheet" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Define all the groups to create
$groups = @(
    @{
        DisplayName = "SG-MVD-Timesheet-WorkWeekMF"
        Description = "MiraVista Timesheet - Monday-Friday work week schedule"
        MailNickname = "SG-MVD-Timesheet-WorkWeekMF"
    },
    @{
        DisplayName = "SG-MVD-Timesheet-WorkWeekTS"
        Description = "MiraVista Timesheet - Tuesday-Saturday work week schedule"
        MailNickname = "SG-MVD-Timesheet-WorkWeekTS"
    },
    @{
        DisplayName = "SG-MVD-Timesheet-ProjectAdmin"
        Description = "MiraVista Timesheet - Project Admin role (manage projects)"
        MailNickname = "SG-MVD-Timesheet-ProjectAdmin"
    },
    @{
        DisplayName = "SG-MVD-Timesheet-AuditReviewer"
        Description = "MiraVista Timesheet - Audit Reviewer role (view timesheet activity)"
        MailNickname = "SG-MVD-Timesheet-AuditReviewer"
    },
    @{
        DisplayName = "SG-MVD-Timesheet-TimesheetAdmin"
        Description = "MiraVista Timesheet - Timesheet Admin role (full admin access)"
        MailNickname = "SG-MVD-Timesheet-TimesheetAdmin"
    },
    @{
        DisplayName = "SG-MVD-Timesheet-Leadership"
        Description = "MiraVista Timesheet - Leadership role (view all timesheets)"
        MailNickname = "SG-MVD-Timesheet-Leadership"
    }
)

# ============================================================
# Option 1: Using AzureAD Module (older)
# ============================================================
function Create-GroupsWithAzureAD {
    foreach ($group in $groups) {
        $existing = Get-AzureADGroup -Filter "displayName eq '$($group.DisplayName)'" -ErrorAction SilentlyContinue

        if ($existing) {
            Write-Host "[SKIP] $($group.DisplayName) already exists (ID: $($existing.ObjectId))" -ForegroundColor Yellow
        } else {
            try {
                $newGroup = New-AzureADGroup `
                    -DisplayName $group.DisplayName `
                    -Description $group.Description `
                    -MailEnabled $false `
                    -SecurityEnabled $true `
                    -MailNickname $group.MailNickname

                Write-Host "[CREATED] $($group.DisplayName) (ID: $($newGroup.ObjectId))" -ForegroundColor Green
            } catch {
                Write-Host "[ERROR] Failed to create $($group.DisplayName): $_" -ForegroundColor Red
            }
        }
    }
}

# ============================================================
# Option 2: Using Microsoft.Graph Module (newer, recommended)
# ============================================================
function Create-GroupsWithMgGraph {
    foreach ($group in $groups) {
        $existing = Get-MgGroup -Filter "displayName eq '$($group.DisplayName)'" -ErrorAction SilentlyContinue

        if ($existing) {
            Write-Host "[SKIP] $($group.DisplayName) already exists (ID: $($existing.Id))" -ForegroundColor Yellow
        } else {
            try {
                $params = @{
                    DisplayName = $group.DisplayName
                    Description = $group.Description
                    MailEnabled = $false
                    SecurityEnabled = $true
                    MailNickname = $group.MailNickname
                }

                $newGroup = New-MgGroup -BodyParameter $params
                Write-Host "[CREATED] $($group.DisplayName) (ID: $($newGroup.Id))" -ForegroundColor Green
            } catch {
                Write-Host "[ERROR] Failed to create $($group.DisplayName): $_" -ForegroundColor Red
            }
        }
    }
}

# ============================================================
# Run the appropriate function based on available module
# ============================================================
Write-Host "Checking for available PowerShell modules..." -ForegroundColor Gray
Write-Host ""

if (Get-Module -ListAvailable -Name Microsoft.Graph.Groups) {
    Write-Host "Using Microsoft.Graph module..." -ForegroundColor Gray
    Write-Host ""

    # Ensure connected
    $context = Get-MgContext
    if (-not $context) {
        Write-Host "Please connect to Microsoft Graph first:" -ForegroundColor Yellow
        Write-Host "  Connect-MgGraph -Scopes 'Group.ReadWrite.All'" -ForegroundColor Cyan
        exit 1
    }

    Create-GroupsWithMgGraph
} elseif (Get-Module -ListAvailable -Name AzureAD) {
    Write-Host "Using AzureAD module..." -ForegroundColor Gray
    Write-Host ""

    # Ensure connected
    try {
        Get-AzureADTenantDetail | Out-Null
    } catch {
        Write-Host "Please connect to Azure AD first:" -ForegroundColor Yellow
        Write-Host "  Connect-AzureAD" -ForegroundColor Cyan
        exit 1
    }

    Create-GroupsWithAzureAD
} else {
    Write-Host "[ERROR] No suitable PowerShell module found." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install one of the following:" -ForegroundColor Yellow
    Write-Host "  Install-Module Microsoft.Graph -Scope CurrentUser" -ForegroundColor Cyan
    Write-Host "  Install-Module AzureAD -Scope CurrentUser" -ForegroundColor Cyan
    exit 1
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Group creation complete!" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Add users to the appropriate groups in Azure Portal" -ForegroundColor White
Write-Host "2. Run 'Sync from Entra ID' in the Timesheet Admin Panel" -ForegroundColor White
Write-Host "3. Users will be assigned roles based on group membership" -ForegroundColor White
Write-Host ""
