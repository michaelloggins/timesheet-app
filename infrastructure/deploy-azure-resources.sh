#!/bin/bash

###############################################################################
# MiraVista Timesheet - Azure Resource Deployment Script
#
# This script provisions all required Azure resources for PRODUCTION environment
#
# Prerequisites:
# - Azure CLI installed and logged in (az login)
# - Contributor access to Azure subscription
# - Execute: chmod +x deploy-azure-resources.sh
#
# Usage: ./deploy-azure-resources.sh
###############################################################################

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load configuration
source ./config.env

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}MiraVista Timesheet - Azure Deployment${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Environment: PRODUCTION"
echo "Location: $LOCATION"
echo "Resource Group: $RESOURCE_GROUP"
echo ""

# Confirm deployment
read -p "Do you want to proceed with deployment? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Deployment cancelled."
    exit 0
fi

###############################################################################
# 1. CREATE RESOURCE GROUP
###############################################################################
echo -e "\n${YELLOW}[1/11] Creating Resource Group...${NC}"

az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION \
  --tags Environment=Production Application=Timesheet Owner=$OWNER

echo -e "${GREEN}✓ Resource Group created${NC}"

###############################################################################
# 2. CREATE AZURE SQL DATABASE
###############################################################################
echo -e "\n${YELLOW}[2/11] Creating Azure SQL Server and Database...${NC}"

# Create SQL Server
az sql server create \
  --name $SQL_SERVER_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --admin-user $SQL_ADMIN_USER \
  --admin-password $SQL_ADMIN_PASSWORD \
  --enable-public-network true

# Configure firewall - Allow Azure services
az sql server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --server $SQL_SERVER_NAME \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Add your IP to firewall (for initial setup)
MY_IP=$(curl -s ifconfig.me)
az sql server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --server $SQL_SERVER_NAME \
  --name AllowMyIP \
  --start-ip-address $MY_IP \
  --end-ip-address $MY_IP

# Create database
az sql db create \
  --resource-group $RESOURCE_GROUP \
  --server $SQL_SERVER_NAME \
  --name $SQL_DATABASE_NAME \
  --service-objective S1 \
  --backup-storage-redundancy Local \
  --zone-redundant false

echo -e "${GREEN}✓ SQL Server and Database created${NC}"

###############################################################################
# 3. CREATE KEY VAULT
###############################################################################
echo -e "\n${YELLOW}[3/11] Creating Azure Key Vault...${NC}"

az keyvault create \
  --name $KEY_VAULT_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --enable-soft-delete true \
  --retention-days 90 \
  --enable-purge-protection false

# Store database password in Key Vault
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "db-password" \
  --value "$SQL_ADMIN_PASSWORD"

echo -e "${GREEN}✓ Key Vault created and secrets stored${NC}"

###############################################################################
# 4. CREATE APP SERVICE PLAN
###############################################################################
echo -e "\n${YELLOW}[4/11] Creating App Service Plan...${NC}"

az appservice plan create \
  --name $APP_SERVICE_PLAN \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --is-linux \
  --sku B2

echo -e "${GREEN}✓ App Service Plan created${NC}"

###############################################################################
# 5. CREATE BACKEND API APP SERVICE
###############################################################################
echo -e "\n${YELLOW}[5/11] Creating Backend API App Service...${NC}"

az webapp create \
  --name $BACKEND_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --plan $APP_SERVICE_PLAN \
  --runtime "NODE:20-lts"

# Enable managed identity
az webapp identity assign \
  --name $BACKEND_APP_NAME \
  --resource-group $RESOURCE_GROUP

# Get managed identity principal ID
BACKEND_IDENTITY=$(az webapp identity show \
  --name $BACKEND_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query principalId \
  --output tsv)

# Grant Key Vault access to backend
az keyvault set-policy \
  --name $KEY_VAULT_NAME \
  --object-id $BACKEND_IDENTITY \
  --secret-permissions get list

echo -e "${GREEN}✓ Backend API App Service created with Managed Identity${NC}"

###############################################################################
# 6. CREATE FRONTEND STATIC WEB APP
###############################################################################
echo -e "\n${YELLOW}[6/11] Creating Frontend Static Web App...${NC}"

az staticwebapp create \
  --name $FRONTEND_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard

echo -e "${GREEN}✓ Frontend Static Web App created${NC}"

###############################################################################
# 7. CREATE STORAGE ACCOUNT
###############################################################################
echo -e "\n${YELLOW}[7/11] Creating Storage Account...${NC}"

az storage account create \
  --name $STORAGE_ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot

# Create container for exports
STORAGE_KEY=$(az storage account keys list \
  --resource-group $RESOURCE_GROUP \
  --account-name $STORAGE_ACCOUNT_NAME \
  --query '[0].value' \
  --output tsv)

az storage container create \
  --name exports \
  --account-name $STORAGE_ACCOUNT_NAME \
  --account-key $STORAGE_KEY

echo -e "${GREEN}✓ Storage Account created${NC}"

###############################################################################
# 8. CREATE AZURE COMMUNICATION SERVICES
###############################################################################
echo -e "\n${YELLOW}[8/11] Creating Azure Communication Services...${NC}"

az communication create \
  --name $ACS_NAME \
  --resource-group $RESOURCE_GROUP \
  --location global \
  --data-location UnitedStates

# Get connection string
ACS_CONNECTION_STRING=$(az communication list-key \
  --name $ACS_NAME \
  --resource-group $RESOURCE_GROUP \
  --query primaryConnectionString \
  --output tsv)

# Store in Key Vault
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "acs-connection-string" \
  --value "$ACS_CONNECTION_STRING"

echo -e "${GREEN}✓ Azure Communication Services created${NC}"
echo -e "${YELLOW}⚠ Manual step required: Configure email domain in Azure Portal${NC}"

###############################################################################
# 9. CREATE APPLICATION INSIGHTS
###############################################################################
echo -e "\n${YELLOW}[9/11] Creating Application Insights...${NC}"

az monitor app-insights component create \
  --app $APP_INSIGHTS_NAME \
  --location $LOCATION \
  --resource-group $RESOURCE_GROUP \
  --application-type web \
  --kind web

# Get instrumentation key
APP_INSIGHTS_KEY=$(az monitor app-insights component show \
  --app $APP_INSIGHTS_NAME \
  --resource-group $RESOURCE_GROUP \
  --query instrumentationKey \
  --output tsv)

# Store in Key Vault
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "app-insights-key" \
  --value "$APP_INSIGHTS_KEY"

echo -e "${GREEN}✓ Application Insights created${NC}"

###############################################################################
# 10. CREATE AZURE FUNCTIONS
###############################################################################
echo -e "\n${YELLOW}[10/11] Creating Azure Functions App...${NC}"

az functionapp create \
  --name $FUNCTIONS_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --storage-account $STORAGE_ACCOUNT_NAME \
  --consumption-plan-location $LOCATION \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4 \
  --os-type Linux

# Enable managed identity
az functionapp identity assign \
  --name $FUNCTIONS_APP_NAME \
  --resource-group $RESOURCE_GROUP

# Get managed identity principal ID
FUNCTIONS_IDENTITY=$(az functionapp identity show \
  --name $FUNCTIONS_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query principalId \
  --output tsv)

# Grant Key Vault access to functions
az keyvault set-policy \
  --name $KEY_VAULT_NAME \
  --object-id $FUNCTIONS_IDENTITY \
  --secret-permissions get list

echo -e "${GREEN}✓ Azure Functions created with Managed Identity${NC}"

###############################################################################
# 11. CONFIGURE APPLICATION SETTINGS
###############################################################################
echo -e "\n${YELLOW}[11/11] Configuring Application Settings...${NC}"

# Backend API settings
az webapp config appsettings set \
  --name $BACKEND_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    NODE_ENV=production \
    DB_SERVER="${SQL_SERVER_NAME}.database.windows.net" \
    DB_NAME=$SQL_DATABASE_NAME \
    DB_USER=$SQL_ADMIN_USER \
    DB_PASSWORD="@Microsoft.KeyVault(SecretUri=https://${KEY_VAULT_NAME}.vault.azure.net/secrets/db-password/)" \
    DB_ENCRYPT=true \
    TENANT_ID=$TENANT_ID \
    CLIENT_ID=$CLIENT_ID \
    CLIENT_SECRET="$CLIENT_SECRET" \
    ACS_CONNECTION_STRING="@Microsoft.KeyVault(SecretUri=https://${KEY_VAULT_NAME}.vault.azure.net/secrets/acs-connection-string/)" \
    ACS_SENDER_ADDRESS=$ACS_SENDER_ADDRESS \
    APPLICATIONINSIGHTS_CONNECTION_STRING="InstrumentationKey=${APP_INSIGHTS_KEY}" \
    ENABLE_PAYCHEX_SYNC=false \
    ENABLE_DIGITAL_SIGNAGE=true

# Functions settings
az functionapp config appsettings set \
  --name $FUNCTIONS_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    DB_SERVER="${SQL_SERVER_NAME}.database.windows.net" \
    DB_NAME=$SQL_DATABASE_NAME \
    DB_USER=$SQL_ADMIN_USER \
    DB_PASSWORD="@Microsoft.KeyVault(SecretUri=https://${KEY_VAULT_NAME}.vault.azure.net/secrets/db-password/)" \
    DB_ENCRYPT=true \
    ACS_CONNECTION_STRING="@Microsoft.KeyVault(SecretUri=https://${KEY_VAULT_NAME}.vault.azure.net/secrets/acs-connection-string/)" \
    ACS_SENDER_ADDRESS=$ACS_SENDER_ADDRESS \
    APP_URL="https://${FRONTEND_APP_NAME}.azurestaticapps.net" \
    APPINSIGHTS_INSTRUMENTATIONKEY=$APP_INSIGHTS_KEY

echo -e "${GREEN}✓ Application settings configured${NC}"

###############################################################################
# DEPLOYMENT SUMMARY
###############################################################################
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}DEPLOYMENT COMPLETED SUCCESSFULLY!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Resources created:"
echo "  ✓ Resource Group: $RESOURCE_GROUP"
echo "  ✓ SQL Server: ${SQL_SERVER_NAME}.database.windows.net"
echo "  ✓ SQL Database: $SQL_DATABASE_NAME"
echo "  ✓ Key Vault: $KEY_VAULT_NAME"
echo "  ✓ App Service Plan: $APP_SERVICE_PLAN"
echo "  ✓ Backend API: https://${BACKEND_APP_NAME}.azurewebsites.net"
echo "  ✓ Frontend: https://${FRONTEND_APP_NAME}.azurestaticapps.net"
echo "  ✓ Functions: $FUNCTIONS_APP_NAME"
echo "  ✓ Storage: $STORAGE_ACCOUNT_NAME"
echo "  ✓ Communication Services: $ACS_NAME"
echo "  ✓ Application Insights: $APP_INSIGHTS_NAME"
echo ""
echo -e "${YELLOW}NEXT STEPS:${NC}"
echo "1. Initialize database schema (see database/README.md)"
echo "2. Configure Entra ID app registration"
echo "3. Set up email domain in Azure Communication Services"
echo "4. Deploy application code (backend, frontend, functions)"
echo "5. Configure custom domain and SSL (optional)"
echo ""
echo "See POST-DEPLOYMENT.md for detailed instructions"
echo ""

# Save deployment info
cat > deployment-info.txt <<EOF
MiraVista Timesheet - Deployment Information
Generated: $(date)

Resource Group: $RESOURCE_GROUP
Location: $LOCATION

SQL Server: ${SQL_SERVER_NAME}.database.windows.net
Database: $SQL_DATABASE_NAME
Admin User: $SQL_ADMIN_USER

Backend API: https://${BACKEND_APP_NAME}.azurewebsites.net
Frontend: https://${FRONTEND_APP_NAME}.azurestaticapps.net
Functions: $FUNCTIONS_APP_NAME

Key Vault: $KEY_VAULT_NAME
Storage Account: $STORAGE_ACCOUNT_NAME
Communication Services: $ACS_NAME
Application Insights: $APP_INSIGHTS_NAME

Your IP (added to firewall): $MY_IP
EOF

echo -e "${GREEN}Deployment info saved to deployment-info.txt${NC}"
