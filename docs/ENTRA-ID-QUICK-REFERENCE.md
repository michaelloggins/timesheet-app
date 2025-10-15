# Entra ID Setup - Quick Reference Card

**Print this page and keep it handy while configuring!**

---

## 🎯 Quick Steps

1. **Azure Portal** → **Entra ID** → **App registrations** → **New registration**

2. **Name:** `MiraVista Timesheet`

3. **Account type:** Single tenant

4. **Register** → Copy IDs

5. **Create secret** → Copy value immediately

6. **Add permissions** → Grant admin consent

7. **Configure authentication** → Add redirect URIs

---

## 📋 Values to Copy

| Item | Where to Find | Save As |
|------|---------------|---------|
| **Application (client) ID** | Overview page | `CLIENT_ID` |
| **Directory (tenant) ID** | Overview page | `TENANT_ID` |
| **Client secret VALUE** | Certificates & secrets | `CLIENT_SECRET` |

---

## 🔑 API Permissions Required

### Delegated Permissions (Microsoft Graph):
- ✅ `User.Read`
- ✅ `User.ReadBasic.All`
- ✅ `offline_access`

### Application Permissions (Microsoft Graph):
- ✅ `Directory.Read.All`
- ✅ `User.Read.All`

**Don't forget:** Click **"Grant admin consent"** after adding!

---

## 🔐 Client Secret Settings

**Description:** `Production Secret`
**Expires:** `24 months`

⚠️ **CRITICAL:** Copy the **VALUE** immediately after creation!
You won't see it again!

---

## 🌐 Redirect URIs

**Platform:** Single-page application (SPA)

**URIs to add:**
```
https://app-miravista-timesheet.azurestaticapps.net
http://localhost:5173
```

---

## 🎭 App Roles to Create

1. **Timesheet Admin**
   - Value: `TimesheetAdmin`
   - For: Full admin access

2. **Manager**
   - Value: `Manager`
   - For: Timesheet approval

3. **Leadership**
   - Value: `Leadership`
   - For: Executive dashboards

---

## ⚙️ Authentication Settings

- ✅ ID tokens enabled
- ❌ Access tokens disabled
- ❌ Public client flows disabled

---

## 🔄 Where to Use These Values

### 1. Infrastructure Config (Before Deployment)

**config.ps1:**
```powershell
$TENANT_ID = "[paste tenant ID]"
$CLIENT_ID = "[paste client ID]"
$CLIENT_SECRET = "[paste secret value]"
```

### 2. Backend (After Deployment)

```bash
az webapp config appsettings set \
  --name api-miravista-timesheet \
  --resource-group rg-miravista-timesheet-prod \
  --settings \
    TENANT_ID="[tenant ID]" \
    CLIENT_ID="[client ID]" \
    CLIENT_SECRET="[secret value]"
```

### 3. Frontend .env

```env
VITE_TENANT_ID=[tenant ID]
VITE_CLIENT_ID=[client ID]
VITE_REDIRECT_URI=https://app-miravista-timesheet.azurestaticapps.net
VITE_AUTHORITY=https://login.microsoftonline.com/[tenant ID]
```

---

## ✅ Verification Checklist

Before leaving Azure Portal:

- [ ] Client ID copied
- [ ] Tenant ID copied
- [ ] Client secret VALUE copied (not the ID!)
- [ ] API permissions added
- [ ] Admin consent granted (green checkmarks visible)
- [ ] Redirect URIs configured
- [ ] ID tokens enabled
- [ ] App roles created

---

## 🆘 Common Issues

| Problem | Solution |
|---------|----------|
| Can't grant admin consent | Need Admin role - contact Azure admin |
| Forgot to copy secret | Create new secret, delete old one |
| Users can't login | Check admin consent + user assignments |
| "Reply URL mismatch" | Verify redirect URI matches exactly |

---

## 📞 Support

**Detailed Guide:** See `docs/ENTRA-ID-SETUP.md`
**IT Help Desk:** helpdesk@miravistalabs.com

---

**⏱️ Estimated Time:** 15-20 minutes

---

## 📝 Notes Section

Use this space to write down your values:

**Tenant ID:**
```
____________________________________
```

**Client ID:**
```
____________________________________
```

**Client Secret (keep secure!):**
```
____________________________________
____________________________________
```

**Frontend URL:**
```
____________________________________
```

**Backend URL:**
```
____________________________________
```

---

**Setup Date:** _______________
**Configured By:** _______________
**Secret Expiry:** _______________ (24 months from setup date)
