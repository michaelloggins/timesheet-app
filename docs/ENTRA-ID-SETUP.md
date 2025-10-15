# Microsoft Entra ID App Registration Setup

This guide walks you through creating the Entra ID (formerly Azure AD) app registration for the MiraVista Timesheet System.

---

## Prerequisites

- Access to Azure Portal (https://portal.azure.com)
- Entra ID Administrator or Application Administrator role
- Knowledge of your frontend URL (or use placeholder for now)

---

## Step 1: Navigate to Entra ID

1. Sign in to [Azure Portal](https://portal.azure.com)
2. In the search bar at the top, type **"Entra ID"** or **"Azure Active Directory"**
3. Click on **Microsoft Entra ID** (or Azure Active Directory)

---

## Step 2: Create App Registration

1. In the left sidebar, click **App registrations**
2. Click **+ New registration** at the top

### Configure Basic Settings

Fill in the registration form:

**Name:**
```
MiraVista Timesheet
```

**Supported account types:**
- Select: **Accounts in this organizational directory only (MiraVista only - Single tenant)**

**Redirect URI (optional):**
- **Platform:** Single-page application (SPA)
- **URI:** Leave blank for now (we'll add it after deployment)
  - Or if you know your Static Web App URL: `https://app-miravista-timesheet.azurestaticapps.net`

3. Click **Register**

✅ **You'll be redirected to the app overview page**

---

## Step 3: Copy Application IDs

On the **Overview** page, you'll see important IDs:

### Copy These Values:

1. **Application (client) ID**
   - Example: `12345678-1234-1234-1234-123456789abc`
   - Save this as `CLIENT_ID`

2. **Directory (tenant) ID**
   - Example: `87654321-4321-4321-4321-cba987654321`
   - Save this as `TENANT_ID`

📝 **Save these somewhere safe - you'll need them for configuration!**

---

## Step 4: Create Client Secret

1. In the left sidebar, click **Certificates & secrets**
2. Click the **Client secrets** tab
3. Click **+ New client secret**

### Configure Secret:

**Description:**
```
Production Secret
```

**Expires:**
- Select: **24 months** (or per your organization's policy)
  - Options: 3 months, 6 months, 12 months, 24 months, Custom

4. Click **Add**

### ⚠️ CRITICAL: Copy the Secret Value

After clicking Add, you'll see the secret. **The Value will only be shown once!**

**Copy the VALUE (not the Secret ID):**
- Example: `abcXYZ123~456.def789ghi012jkl345mno678pqr901stu234`
- This is about 40 characters long
- Save this as `CLIENT_SECRET`

📝 **Copy this immediately! You won't be able to see it again!**

If you miss it, you'll need to create a new secret.

---

## Step 5: Configure API Permissions

1. In the left sidebar, click **API permissions**
2. You'll see **Microsoft Graph - User.Read** is already added

### Add Additional Permissions:

Click **+ Add a permission**

### A. Add Delegated Permissions

1. Click **Microsoft Graph**
2. Click **Delegated permissions**
3. Search and select the following:
   - ✅ **User.Read** (already added)
   - ✅ **User.ReadBasic.All** - Read all users' basic profiles
   - ✅ **offline_access** - Maintain access to data
4. Click **Add permissions**

### B. Add Application Permissions

1. Click **+ Add a permission** again
2. Click **Microsoft Graph**
3. Click **Application permissions**
4. Search and select:
   - ✅ **Directory.Read.All** - Read directory data
   - ✅ **User.Read.All** - Read all users' full profiles
5. Click **Add permissions**

### C. Grant Admin Consent

**This is critical - the app won't work without this!**

1. After adding all permissions, you'll see a list of permissions
2. Some will show "Admin consent required" in red
3. Click **✓ Grant admin consent for [Your Organization Name]**
4. Click **Yes** to confirm
5. All permissions should now show a green checkmark under "Status"

---

## Step 6: Configure Authentication Settings

1. In the left sidebar, click **Authentication**

### Platform Configurations:

You should see **Single-page application** with your redirect URI.

If not, click **+ Add a platform** → **Single-page application**

### Add Redirect URIs:

Add these URIs (adjust based on your deployment):

**For Production:**
```
https://app-miravista-timesheet.azurestaticapps.net
```

**For Local Development:**
```
http://localhost:5173
```

You can add multiple URIs - one per line.

### Implicit Grant and Hybrid Flows:

Under **Implicit grant and hybrid flows**, enable:
- ✅ **ID tokens (used for implicit and hybrid flows)**

Leave Access tokens unchecked (not needed for SPA).

### Advanced Settings:

Scroll down to **Advanced settings**:

**Allow public client flows:**
- Leave as **No**

**Treat application as a public client:**
- Leave as **No**

2. Click **Save** at the top

---

## Step 7: Configure Token Configuration (Optional)

This step is optional but recommended for better user experience.

1. In the left sidebar, click **Token configuration**
2. Click **+ Add optional claim**
3. Select **ID**
4. Add these claims:
   - ✅ **email**
   - ✅ **family_name**
   - ✅ **given_name**
5. Click **Add**
6. If prompted about Microsoft Graph permissions, click **Yes, add required scopes**

---

## Step 8: Configure App Roles (For User Authorization)

1. In the left sidebar, click **App roles**
2. Click **+ Create app role**

### Create Roles:

#### Role 1: Timesheet Admin

```
Display name: Timesheet Admin
Allowed member types: Users/Groups
Value: TimesheetAdmin
Description: Full administrative access to the timesheet system
```

Click **Apply**

#### Role 2: Manager

```
Display name: Manager
Allowed member types: Users/Groups
Value: Manager
Description: Can approve timesheets and view team reports
```

Click **Apply**

#### Role 3: Leadership

```
Display name: Leadership
Allowed member types: Users/Groups
Value: Leadership
Description: Can view executive dashboards and KPIs
```

Click **Apply**

---

## Step 9: Create Enterprise Application (Automatic)

When you created the app registration, Entra ID automatically created a corresponding Enterprise Application.

### Assign Users to Roles:

1. Go back to **Microsoft Entra ID** home
2. Click **Enterprise applications** in the left sidebar
3. Search for **MiraVista Timesheet**
4. Click on it

### Assign Users:

1. Click **Users and groups** in left sidebar
2. Click **+ Add user/group**
3. Click **Users and groups** (not selected yet)
4. Search for a user (e.g., yourself)
5. Click **Select**
6. Click **Select a role**
7. Choose a role (e.g., **Timesheet Admin** for administrators)
8. Click **Select**
9. Click **Assign**

Repeat for all users who need access to the system.

---

## Step 10: Update Configuration Files

Now update your configuration files with the values you copied:

### For PowerShell (config.ps1):

```powershell
$TENANT_ID = "87654321-4321-4321-4321-cba987654321"
$CLIENT_ID = "12345678-1234-1234-1234-123456789abc"
$CLIENT_SECRET = "abcXYZ123~456.def789ghi012jkl345mno678pqr901stu234"
```

### For Bash (config.env):

```bash
TENANT_ID="87654321-4321-4321-4321-cba987654321"
CLIENT_ID="12345678-1234-1234-1234-123456789abc"
CLIENT_SECRET="abcXYZ123~456.def789ghi012jkl345mno678pqr901stu234"
```

### For Backend App Service (after deployment):

```bash
az webapp config appsettings set \
  --name api-miravista-timesheet \
  --resource-group rg-miravista-timesheet-prod \
  --settings \
    TENANT_ID="87654321-4321-4321-4321-cba987654321" \
    CLIENT_ID="12345678-1234-1234-1234-123456789abc" \
    CLIENT_SECRET="abcXYZ123~456.def789ghi012jkl345mno678pqr901stu234"
```

### For Frontend .env file:

```env
VITE_TENANT_ID=87654321-4321-4321-4321-cba987654321
VITE_CLIENT_ID=12345678-1234-1234-1234-123456789abc
VITE_REDIRECT_URI=https://app-miravista-timesheet.azurestaticapps.net
VITE_AUTHORITY=https://login.microsoftonline.com/87654321-4321-4321-4321-cba987654321
```

---

## Step 11: Create Leadership Security Group (Optional)

For the Leadership dashboard feature:

1. Go to **Microsoft Entra ID** → **Groups**
2. Click **+ New group**
3. Configure:
   - **Group type:** Security
   - **Group name:** Leadership Team
   - **Group description:** Leadership access for timesheet system
   - **Members:** Add VP and C-level executives
4. Click **Create**
5. Click on the group after creation
6. Copy the **Object ID**
7. Update backend configuration:

```bash
az webapp config appsettings set \
  --name api-miravista-timesheet \
  --resource-group rg-miravista-timesheet-prod \
  --settings LEADERSHIP_GROUP_ID="[group-object-id]"
```

---

## Verification Checklist

Before proceeding with deployment, verify:

- [ ] App registration created
- [ ] Client ID copied and saved
- [ ] Tenant ID copied and saved
- [ ] Client secret created and copied (40+ character value)
- [ ] API permissions added:
  - [ ] User.Read (Delegated)
  - [ ] User.ReadBasic.All (Delegated)
  - [ ] Directory.Read.All (Application)
  - [ ] User.Read.All (Application)
- [ ] Admin consent granted (green checkmarks on all permissions)
- [ ] Redirect URI configured for SPA
- [ ] ID tokens enabled
- [ ] App roles created (TimesheetAdmin, Manager, Leadership)
- [ ] Users assigned to roles in Enterprise Application
- [ ] Configuration files updated with IDs and secret
- [ ] Leadership security group created (optional)

---

## Troubleshooting

### Issue: Can't grant admin consent

**Solution:** You need Entra ID Administrator or Global Administrator role. Contact your Azure admin.

### Issue: Forgot to copy client secret

**Solution:**
1. Go back to **Certificates & secrets**
2. Delete the old secret
3. Create a new secret
4. Copy the new value

### Issue: Users can't login

**Possible causes:**
- Admin consent not granted
- User not assigned to the Enterprise Application
- Redirect URI doesn't match exactly (check for trailing slashes)

**Solution:**
1. Verify admin consent has green checkmarks
2. Assign users in Enterprise Applications
3. Double-check redirect URI

### Issue: "AADSTS50011: The reply URL specified in the request does not match"

**Solution:**
1. Go to **Authentication**
2. Verify redirect URI matches exactly (including https://)
3. Remove any trailing slashes
4. Save and wait 5 minutes for changes to propagate

---

## Security Best Practices

✅ **Do:**
- Rotate client secrets every 12-24 months
- Use the least privilege principle for role assignments
- Store secrets in Azure Key Vault (done automatically by deployment script)
- Monitor sign-in logs for suspicious activity

❌ **Don't:**
- Share client secrets via email or chat
- Commit client secrets to source control (.gitignore handles this)
- Grant more permissions than necessary
- Leave unused secrets active

---

## Additional Resources

- [Microsoft Entra ID Documentation](https://learn.microsoft.com/en-us/entra/identity/)
- [App Registration Best Practices](https://learn.microsoft.com/en-us/entra/identity-platform/app-registration-best-practices)
- [MSAL.js Documentation](https://learn.microsoft.com/en-us/azure/active-directory/develop/msal-overview)

---

## Summary

You now have:
- ✅ App registration configured
- ✅ Client ID, Tenant ID, and Client Secret
- ✅ API permissions granted
- ✅ Authentication configured
- ✅ App roles defined
- ✅ Ready to deploy!

**Next Step:** Update `infrastructure/config.ps1` (or `config.env`) with your IDs and secret, then run the deployment script.

---

**Questions?** Contact IT Help Desk: helpdesk@miravistalabs.com
