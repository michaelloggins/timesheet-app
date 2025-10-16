###############################################################################
# Local Development Environment Setup Script
#
# This script helps you set up .env files for local development
###############################################################################

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Green
Write-Host "Local Development Environment Setup" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Check if running in the correct directory
if (-not (Test-Path "package.json")) {
    Write-Host "[ERROR] Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Function to prompt for value with default
function Get-ConfigValue {
    param(
        [string]$Prompt,
        [string]$Default = "",
        [bool]$IsSecret = $false
    )

    if ($Default) {
        Write-Host "$Prompt [$Default]: " -NoNewline -ForegroundColor Yellow
    } else {
        Write-Host "${Prompt}: " -NoNewline -ForegroundColor Yellow
    }

    if ($IsSecret) {
        $value = Read-Host -AsSecureString
        $value = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($value)
        )
    } else {
        $value = Read-Host
    }

    if ([string]::IsNullOrWhiteSpace($value) -and $Default) {
        return $Default
    }
    return $value
}

Write-Host "This script will help you create .env files for local development." -ForegroundColor Cyan
Write-Host "You'll need the following information:" -ForegroundColor Cyan
Write-Host "  - Azure SQL Database credentials" -ForegroundColor Cyan
Write-Host "  - Microsoft Entra ID (Azure AD) app registration details" -ForegroundColor Cyan
Write-Host ""

# Ask if user wants to proceed
$proceed = Read-Host "Do you want to continue? (y/n)"
if ($proceed -ne "y") {
    Write-Host "Setup cancelled." -ForegroundColor Yellow
    exit 0
}

###############################################################################
# BACKEND .ENV SETUP
###############################################################################

Write-Host ""
Write-Host "[1/2] Backend Configuration (.env)" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# Check if backend .env already exists
if (Test-Path "backend/.env") {
    Write-Host ""
    Write-Host "WARNING: backend/.env already exists!" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to overwrite it? (y/n)"
    if ($overwrite -ne "y") {
        Write-Host "Skipping backend .env setup." -ForegroundColor Yellow
    } else {
        Remove-Item "backend/.env"
    }
}

if (-not (Test-Path "backend/.env")) {
    Write-Host ""
    Write-Host "Azure SQL Database Configuration:" -ForegroundColor Cyan
    $dbServer = Get-ConfigValue "Database Server" "sql-miravista-prod.database.windows.net"
    $dbName = Get-ConfigValue "Database Name" "TimesheetDB"
    $dbUser = Get-ConfigValue "Database Username" "sqladmin"
    $dbPassword = Get-ConfigValue "Database Password" "" $true

    Write-Host ""
    Write-Host "Microsoft Entra ID Configuration:" -ForegroundColor Cyan
    $tenantId = Get-ConfigValue "Tenant ID"
    $clientId = Get-ConfigValue "Client ID (Application ID)"
    $clientSecret = Get-ConfigValue "Client Secret" "" $true

    Write-Host ""
    Write-Host "Security Configuration:" -ForegroundColor Cyan
    Write-Host "Generating random JWT secret..." -ForegroundColor Gray
    $jwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})

    # Create backend .env file
    $backendEnv = @"
# Server Configuration
NODE_ENV=development
PORT=3001
API_BASE_URL=http://localhost:3001

# Azure SQL Database
DB_SERVER=$dbServer
DB_NAME=$dbName
DB_USER=$dbUser
DB_PASSWORD=$dbPassword
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=false

# Microsoft Entra ID / Azure AD
TENANT_ID=$tenantId
CLIENT_ID=$clientId
CLIENT_SECRET=$clientSecret
AUTHORITY=https://login.microsoftonline.com/$tenantId

# Microsoft Graph API
GRAPH_API_ENDPOINT=https://graph.microsoft.com/v1.0
GRAPH_API_SCOPES=https://graph.microsoft.com/.default

# Azure Communication Services (Email) - Optional for local dev
ACS_CONNECTION_STRING=
ACS_SENDER_ADDRESS=noreply@miravistalabs.com
ACS_REPLY_TO_ADDRESS=timesheets@miravistalabs.com

# Security
JWT_SECRET=$jwtSecret
SESSION_SECRET=$jwtSecret
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Feature Flags
ENABLE_PAYCHEX_SYNC=false
ENABLE_DIGITAL_SIGNAGE=true
ENABLE_GAMIFICATION=true

# Logging
LOG_LEVEL=debug
LOG_FILE=logs/app.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Session
SESSION_TIMEOUT_HOURS=8
"@

    $backendEnv | Out-File -FilePath "backend/.env" -Encoding utf8
    Write-Host ""
    Write-Host "[OK] Created backend/.env" -ForegroundColor Green
}

###############################################################################
# FRONTEND .ENV SETUP
###############################################################################

Write-Host ""
Write-Host "[2/2] Frontend Configuration (.env)" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# Check if frontend .env already exists
if (Test-Path "frontend/.env") {
    Write-Host ""
    Write-Host "WARNING: frontend/.env already exists!" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to overwrite it? (y/n)"
    if ($overwrite -ne "y") {
        Write-Host "Skipping frontend .env setup." -ForegroundColor Yellow
    } else {
        Remove-Item "frontend/.env"
    }
}

if (-not (Test-Path "frontend/.env")) {
    # Reuse values from backend setup
    if (-not $tenantId) {
        Write-Host ""
        Write-Host "Microsoft Entra ID Configuration:" -ForegroundColor Cyan
        $tenantId = Get-ConfigValue "Tenant ID"
        $clientId = Get-ConfigValue "Client ID (Application ID)"
    }

    # Create frontend .env file
    $frontendEnv = @"
# API Configuration - Points to local backend
VITE_API_BASE_URL=http://localhost:3001/api

# Microsoft Entra ID / MSAL Configuration
VITE_TENANT_ID=$tenantId
VITE_CLIENT_ID=$clientId
VITE_REDIRECT_URI=http://localhost:5173
VITE_AUTHORITY=https://login.microsoftonline.com/$tenantId

# Microsoft Graph API
VITE_GRAPH_SCOPES=User.Read,User.ReadBasic.All,Directory.Read.All

# Feature Flags
VITE_ENABLE_DIGITAL_SIGNAGE=true
VITE_ENABLE_GAMIFICATION=true
VITE_ENABLE_PAYCHEX_SYNC=false

# Application Configuration
VITE_APP_NAME=MiraVista Timesheet
VITE_COMPANY_NAME=MiraVista Diagnostics
VITE_APP_VERSION=1.0.0

# Environment
VITE_ENVIRONMENT=development
"@

    $frontendEnv | Out-File -FilePath "frontend/.env" -Encoding utf8
    Write-Host ""
    Write-Host "[OK] Created frontend/.env" -ForegroundColor Green
}

###############################################################################
# FINAL STEPS
###############################################################################

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Install dependencies:" -ForegroundColor White
Write-Host "     npm install" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Add your IP to Azure SQL firewall:" -ForegroundColor White
Write-Host "     az sql server firewall-rule create \" -ForegroundColor Gray
Write-Host "       --resource-group rg-miravista-timesheet-prod \" -ForegroundColor Gray
Write-Host "       --server sql-miravista-prod \" -ForegroundColor Gray
Write-Host "       --name 'YourName-LocalDev' \" -ForegroundColor Gray
Write-Host "       --start-ip-address YOUR_IP \" -ForegroundColor Gray
Write-Host "       --end-ip-address YOUR_IP" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Verify Entra ID redirect URI includes:" -ForegroundColor White
Write-Host "     http://localhost:5173" -ForegroundColor Gray
Write-Host ""
Write-Host "  4. Start development servers:" -ForegroundColor White
Write-Host "     npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "  5. Open your browser:" -ForegroundColor White
Write-Host "     Frontend: http://localhost:5173" -ForegroundColor Gray
Write-Host "     Backend:  http://localhost:3001/health" -ForegroundColor Gray
Write-Host ""

Write-Host "For more information, see LOCAL-DEVELOPMENT.md" -ForegroundColor Cyan
Write-Host ""
